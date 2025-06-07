export async function GET(request: Request) {
    return new Response(JSON.stringify({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}