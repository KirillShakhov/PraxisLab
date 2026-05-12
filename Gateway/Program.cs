var builder = WebApplication.CreateBuilder(args);

// Подключаем YARP и загружаем настройки маршрутизации из appsettings.json
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

// Маршрутизируем запросы
app.MapReverseProxy();

app.Run();