export default {
    async fetch(request) {
        const targetUrl = "https://script.google.com/macros/s/AKfycbzFwUtiMQIL4TBLh-8ORkDoL55iAuC2dWDRA_mn_nvTMPIiJsu_CYXYOF628R_DtZ0v/exec";

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: { "Content-Type": "application/json" },
            body: request.method === "POST" ? await request.text() : undefined
        });

        const data = await response.text();

        return new Response(data, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            }
        });
    }
}
