using Microsoft.EntityFrameworkCore;

namespace DecentralizedVLab.Courses;

public class VLabDbContext(DbContextOptions<VLabDbContext> options) : DbContext(options)
{
    public DbSet<CourseEntity> Courses => Set<CourseEntity>();
}

public class CourseEntity
{
    public string Id { get; set; } = "";
    public long UpdatedAt { get; set; }
    public string JsonData { get; set; } = "";
    public string LastDeviceId { get; set; } = "";
}
