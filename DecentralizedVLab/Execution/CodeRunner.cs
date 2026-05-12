using System.Net.Http.Json;

namespace DecentralizedVLab.Execution;

public class CodeRunner(HttpClient httpClient, IConfiguration configuration)
{
    private readonly string _baseUrl =
        (configuration["Execution:BaseUrl"] ?? "http://execution:8080").TrimEnd('/');

    public async Task<ExecuteResponse> RunAsync(ExecuteRequest request)
    {
        var response = await httpClient.PostAsJsonAsync($"{_baseUrl}/execute", request);
        if (!response.IsSuccessStatusCode)
            throw new ArgumentException(await response.Content.ReadAsStringAsync());

        return await response.Content.ReadFromJsonAsync<ExecuteResponse>()
               ?? throw new InvalidOperationException("Execution service returned an empty response.");
    }
}
