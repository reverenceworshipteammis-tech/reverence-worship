export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = new URL(request.url);
  destination.pathname = `/admin/forms/${encodeURIComponent(id)}/duplicate`;
  return Response.redirect(destination, 307);
}
