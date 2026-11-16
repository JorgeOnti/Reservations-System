using System.Text.Json.Serialization;
using Bookings.Api.Controllers;
using Bookings.Api.Data;
using Bookings.Api.Dtos;
using Bookings.Api.Options;
using Bookings.Api.Services;
using Bookings.Api.Services.Email;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Opciones ----------
builder.Services.Configure<BusinessOptions>(config.GetSection(BusinessOptions.SectionName));
builder.Services.Configure<FrontendOptions>(config.GetSection(FrontendOptions.SectionName));
builder.Services.Configure<SmtpOptions>(config.GetSection(SmtpOptions.SectionName));

// ---------- Persistencia ----------
builder.Services.AddDbContext<BookingsDbContext>(options =>
    options.UseSqlite(config.GetConnectionString("Bookings") ?? "Data Source=bookings.db"));

// ---------- Dominio / aplicación ----------
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IBusinessClock, BusinessClock>();
builder.Services.AddSingleton<BookingMapper>();
builder.Services.AddSingleton<EmailTemplateBuilder>();
builder.Services.AddScoped<AvailabilityService>();
builder.Services.AddScoped<BookingService>();

var smtpOptions = config.GetSection(SmtpOptions.SectionName).Get<SmtpOptions>() ?? new SmtpOptions();
if (smtpOptions.IsConfigured)
{
    builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
}
else
{
    builder.Services.AddSingleton<IEmailService, LoggingEmailService>();
}

// ---------- API ----------
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Errores de validación con un formato uniforme: { message, errors }.
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(entry => entry.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    entry => ToCamelCase(entry.Key),
                    entry => entry.Value!.Errors
                        .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Valor inválido." : e.ErrorMessage)
                        .ToArray());

            var message = errors.Count == 1 && errors.First().Value.Length == 1
                ? errors.First().Value[0]
                : "La solicitud contiene datos inválidos. Revisa los campos marcados.";

            return new BadRequestObjectResult(new ApiError(message, errors));
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sistema de Reservas API",
        Version = "v1",
        Description = "API REST para catálogo de servicios, disponibilidad y reservas.",
    });

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "Bookings.Api.xml");
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

const string CorsPolicy = "Frontend";
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders(AvailabilityController.DayStatusHeader)));

var app = builder.Build();

// ---------- Base de datos + seed ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookingsDbContext>();
    db.Database.EnsureCreated();
    DbSeeder.Seed(db, app.Logger);
}

if (smtpOptions.IsConfigured)
{
    app.Logger.LogInformation("Correo: modo SMTP ({Host}:{Port}).", smtpOptions.Host, smtpOptions.Port);
}
else
{
    app.Logger.LogInformation("Correo: SMTP no configurado; los correos se mostrarán en la consola (modo fallback).");
}

// ---------- Pipeline HTTP ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Sistema de Reservas API");
}
else
{
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new ApiError("Ocurrió un error inesperado. Intenta de nuevo más tarde."));
    }));
}

app.UseCors(CorsPolicy);
app.MapControllers();
app.MapGet("/", () => Results.Redirect(app.Environment.IsDevelopment() ? "/swagger" : "/api/health"))
    .ExcludeFromDescription();

app.Run();

static string ToCamelCase(string key)
{
    key = key.TrimStart('$', '.');
    return string.IsNullOrEmpty(key) ? "request" : char.ToLowerInvariant(key[0]) + key[1..];
}
