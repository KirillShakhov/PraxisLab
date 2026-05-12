using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DecentralizedVLab.Courses;

[ApiController]
[Route("api/courses")]
public class CourseSyncController(VLabDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entities = await db.Courses.ToListAsync();
        var courses = entities.Select(e => JsonSerializer.Deserialize<object>(e.JsonData)!);
        return Ok(courses);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Upsert(string id, [FromBody] JsonElement body)
    {
        var deviceId = Request.Headers["X-Device-Id"].FirstOrDefault() ?? "";
        var updatedAt = body.TryGetProperty("updatedAt", out var ts) ? ts.GetInt64() : 0;

        var existing = await db.Courses.FindAsync(id);

        if (existing != null && existing.UpdatedAt >= updatedAt)
        {
            // Server version wins — return it
            return Ok(JsonSerializer.Deserialize<object>(existing.JsonData));
        }

        var json = body.GetRawText();
        if (existing == null)
        {
            db.Courses.Add(new CourseEntity { Id = id, UpdatedAt = updatedAt, JsonData = json, LastDeviceId = deviceId });
        }
        else
        {
            existing.UpdatedAt = updatedAt;
            existing.JsonData = json;
            existing.LastDeviceId = deviceId;
        }

        await db.SaveChangesAsync();
        return Ok(body);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var entity = await db.Courses.FindAsync(id);
        if (entity != null)
        {
            db.Courses.Remove(entity);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }
}
