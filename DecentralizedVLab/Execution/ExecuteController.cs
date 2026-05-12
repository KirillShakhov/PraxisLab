using Microsoft.AspNetCore.Mvc;

namespace DecentralizedVLab.Execution;

[ApiController]
[Route("api/execute")]
public class ExecuteController(CodeRunner runner) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Execute([FromBody] ExecuteRequest request)
    {
        try
        {
            var result = await runner.RunAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
