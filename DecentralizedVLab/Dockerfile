# Используем образ aspnet, так как нам нужен веб-сервер, а не просто консольный рантайм
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["DecentralizedVLab/DecentralizedVLab.csproj", "DecentralizedVLab/"]
RUN dotnet restore "DecentralizedVLab/DecentralizedVLab.csproj"
COPY . .
WORKDIR "/src/DecentralizedVLab"
RUN dotnet build "./DecentralizedVLab.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./DecentralizedVLab.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DecentralizedVLab.dll"]
