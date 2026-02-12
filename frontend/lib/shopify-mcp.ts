export async function callMCP(
  store: string,
  method: string,
  args: Record<string, unknown>,
) {
  const res = await fetch(`https://${store}/api/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: method, arguments: args },
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "MCP error");
  return JSON.parse(json.result.content[0].text);
}
