using System.Diagnostics;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<CodeRunner>();

var app = builder.Build();

app.MapGet("/", () => "Execution service is ready.");

app.MapPost("/execute", async (ExecuteRequest request, CodeRunner runner) =>
{
    try
    {
        return Results.Ok(await runner.RunAsync(request));
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.Run();

public record ExecuteRequest(
    string Language,
    Dictionary<string, string> Files,
    string? Stdin
);

public record ExecuteResponse(string Stdout, string Stderr, double DurationMs, bool TimedOut);

public class CodeRunner
{
    private static readonly Dictionary<string, (string Entry, string Cmd, string Args)> Commands = new()
    {
        ["python"]     = ("main.py",  "python3", "-u main.py"),
        ["javascript"] = ("main.js",  "node",    "main.js"),
        ["sqlite"]     = ("main.sql", "sqlite3", "-init main.sql \"\" \".quit\""),
        ["lua"]        = ("main.lua", "lua5.4",  "main.lua"),
    };

    public async Task<ExecuteResponse> RunAsync(ExecuteRequest request)
    {
        Validate(request);

        if (!Commands.TryGetValue(request.Language.ToLowerInvariant(), out var cmd))
            throw new ArgumentException($"Unsupported language: {request.Language}");

        var tempDir = Directory.CreateTempSubdirectory("vlab_");
        try
        {
            foreach (var (path, content) in request.Files)
            {
                var fullPath = Path.Combine(tempDir.FullName, path);
                Directory.CreateDirectory(Path.GetDirectoryName(fullPath) ?? tempDir.FullName);
                await File.WriteAllTextAsync(fullPath, content);
            }

            EnsureEntryPoint(tempDir.FullName, cmd.Entry, request.Files);

            return await RunProcessAsync(tempDir.FullName, cmd.Cmd, cmd.Args, request.Stdin);
        }
        finally
        {
            try { tempDir.Delete(recursive: true); } catch { /* best-effort cleanup */ }
        }
    }

    private static void EnsureEntryPoint(
        string workDir,
        string entryPoint,
        Dictionary<string, string> files)
    {
        var entryPath = Path.Combine(workDir, entryPoint);
        if (File.Exists(entryPath) || files.Count == 0)
            return;

        var fallback = files.FirstOrDefault(f =>
            Path.GetExtension(f.Key).Equals(Path.GetExtension(entryPoint), StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrEmpty(fallback.Key))
            fallback = files.First();

        File.WriteAllText(entryPath, fallback.Value);
    }

    private static async Task<ExecuteResponse> RunProcessAsync(
        string workDir, string cmd, string args, string? stdin)
    {
        var psi = new ProcessStartInfo(cmd, args)
        {
            WorkingDirectory = workDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
        };

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        using var process = new Process { StartInfo = psi };

        var sw = Stopwatch.StartNew();
        process.Start();

        if (!string.IsNullOrEmpty(stdin))
            await process.StandardInput.WriteAsync(stdin);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);

        bool timedOut = false;
        try
        {
            await process.WaitForExitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            timedOut = true;
            try { process.Kill(entireProcessTree: true); } catch { }
        }

        sw.Stop();

        var stdout = await ReadOrEmpty(stdoutTask);
        var stderr = await ReadOrEmpty(stderrTask);

        return new ExecuteResponse(stdout, stderr, sw.Elapsed.TotalMilliseconds, timedOut);
    }

    private static async Task<string> ReadOrEmpty(Task<string> task)
    {
        try { return await task.ConfigureAwait(false); }
        catch (OperationCanceledException) { return string.Empty; }
    }

    private static void Validate(ExecuteRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Language))
            throw new ArgumentException("Language is required.");

        if (req.Files is null || req.Files.Count == 0)
            throw new ArgumentException("At least one file is required.");

        if (req.Files.Count > 20)
            throw new ArgumentException("Too many files (max 20).");

        long totalSize = req.Files.Values.Sum(v => Encoding.UTF8.GetByteCount(v));
        if (totalSize > 500 * 1024)
            throw new ArgumentException("Total file size exceeds 500 KB.");

        foreach (var path in req.Files.Keys)
        {
            if (Path.IsPathRooted(path) || path.Contains(".."))
                throw new ArgumentException($"Invalid file path: {path}");
        }
    }
}
