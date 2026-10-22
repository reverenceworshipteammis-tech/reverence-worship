export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = new URL(request.url);
  destination.pathname = `/admin/forms/${encodeURIComponent(id)}/submissions/export`;
  return Response.redirect(destination, 307);
}
