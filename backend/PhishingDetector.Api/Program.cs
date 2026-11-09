using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

// A demo escuta somente no próprio computador.
builder.WebHost.UseUrls("http://127.0.0.1:5000");

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalExtension", policy => policy
        .SetIsOriginAllowed(origin => Regex.IsMatch(
            origin,
            @"^chrome-extension://[a-p]{32}$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors("LocalExtension");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/", () => Results.File(
    Path.Combine(AppContext.BaseDirectory, "index.html"), "text/html; charset=utf-8"));
app.MapGet("/exemplo/login", () => Results.File(
    Path.Combine(AppContext.BaseDirectory, "example.html"), "text/html; charset=utf-8"));

app.MapPost("/api/analyze", (AnalyzeRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Url) || request.Url.Length > 4096 ||
        !Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
        (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
        string.IsNullOrWhiteSpace(uri.Host))
    {
        return Results.BadRequest(new
        {
            error = "Informe uma URL absoluta HTTP ou HTTPS válida, com até 4096 caracteres."
        });
    }

    return Results.Ok(UrlAnalyzer.Analyze(uri, request.Url));
});

app.Run();

public sealed record AnalyzeRequest(string? Url);
