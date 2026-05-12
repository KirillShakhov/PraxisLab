namespace DecentralizedVLab.Execution;

public record ExecuteRequest(
    string Language,
    Dictionary<string, string> Files,
    string? Stdin
);

public record ExecuteResponse(string Stdout, string Stderr, double DurationMs, bool TimedOut);
