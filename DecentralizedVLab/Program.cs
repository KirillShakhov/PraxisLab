using DecentralizedVLab.Courses;
using DecentralizedVLab.Execution;
using DecentralizedVLab.Hubs;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient<CodeRunner>();

builder.Services.AddDbContext<VLabDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
                  ?? "Data Source=/app/data/vlab.db"));

// Добавляем SignalR
builder.Services.AddSignalR()
    .AddMessagePackProtocol();

// Политика CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:8080",
                "http://127.0.0.1:8080", 
                "http://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 2. Настраиваем доверие к прокси-серверу (YARP)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<VLabDbContext>().Database.EnsureCreated();

app.UseForwardedHeaders();

app.UseCors("AllowViteFrontend");

app.MapControllers();

app.MapHub<SyncHub>("/sync-hub");

app.MapGet("/", () => "Backend is ready.");

app.Run();
