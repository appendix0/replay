export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  return Response.json({
    key_defined: !!key,
    key_starts_with: key?.slice(0, 10),
    key_length: key?.length,
  })
}
