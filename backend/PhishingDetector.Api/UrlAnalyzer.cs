using System.Net;

public sealed record AnalysisSignal(string Id, string Reason, int Points);

public sealed record AnalysisResult(
    string Classification,
    string Title,
    int Score,
    IReadOnlyList<AnalysisSignal> Signals,
    IReadOnlyList<string> Reasons,
    string Recommendation,
    string Limitation);

public static class UrlAnalyzer
{
    private static readonly string[] SuspiciousTerms =
    [
        "login", "verificacao", "verify", "senha", "password", "conta", "account", "atualizacao"
    ];

    public static AnalysisResult Analyze(Uri uri, string originalUrl)
    {
        var signals = new List<AnalysisSignal>();
        var host = uri.IdnHost.ToLowerInvariant();
        var path = uri.AbsolutePath.ToLowerInvariant();

        if (IPAddress.TryParse(uri.Host.Trim('[', ']'), out _))
        {
            signals.Add(new("ip_host", "O endereço usa um número IP no lugar de um nome de site.", 3));
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            signals.Add(new("userinfo", "O endereço contém informações antes de '@', que podem disfarçar o destino real.", 3));
        }

        if (host.Contains("xn--", StringComparison.Ordinal))
        {
            signals.Add(new("punycode", "O nome do site contém caracteres internacionais codificados; confira o domínio com atenção.", 2));
        }

        // Regra simples para a demo: três ou mais partes antes das duas finais.
        if (host.Split('.', StringSplitOptions.RemoveEmptyEntries).Length >= 5)
        {
            signals.Add(new("subdomains", "O endereço tem muitos subdomínios, o que pode dificultar identificar o site principal.", 2));
        }

        if (originalUrl.Length > 120)
        {
            signals.Add(new("length", "O endereço é muito longo e pode esconder partes importantes.", 1));
        }

        if (SuspiciousTerms.Any(term => host.Contains(term, StringComparison.Ordinal) ||
                                        path.Contains(term, StringComparison.Ordinal)))
        {
            signals.Add(new("terms", "O endereço usa palavras relacionadas a acesso, senha ou verificação.", 1));
        }

        if (uri.Scheme == Uri.UriSchemeHttp)
        {
            signals.Add(new("http", "A conexão usa HTTP, sem a proteção de transporte do HTTPS.", 1));
        }

        var score = signals.Sum(signal => signal.Points);
        IReadOnlyList<string> reasons = signals.Count > 0
            ? signals.Select(signal => signal.Reason).ToArray()
            : ["Nenhum dos sinais locais definidos nesta demo foi identificado."];

        if (score >= 2)
        {
            return new AnalysisResult(
                "suspeita_forte",
                "Suspeita forte",
                score,
                signals,
                reasons,
                "Evite informar dados pessoais. Confirme o endereço por um canal oficial.",
                Limitation);
        }

        if (score > 0)
        {
            return new AnalysisResult(
                "atencao",
                "Atenção",
                score,
                signals,
                reasons,
                "Um sinal isolado também pode ocorrer em sites legítimos. Confira o endereço antes de informar dados pessoais.",
                Limitation);
        }

        return new AnalysisResult(
            "nenhuma_ameaca_conhecida",
            "Nenhuma ameaça conhecida encontrada",
            score,
            signals,
            reasons,
            "Continue atento ao conteúdo e confirme o endereço quando houver dúvida.",
            Limitation);
    }

    private const string Limitation =
        "Esta demo usa apenas regras locais, não consulta bases de ameaças e não garante que o site seja seguro.";
}
