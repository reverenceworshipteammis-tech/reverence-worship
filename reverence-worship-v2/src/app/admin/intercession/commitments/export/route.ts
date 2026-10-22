export async function GET(request: Request) {
  const destination = new URL(request.url);
  destination.pathname = "/admin/forms/commitments/export";
  return Response.redirect(destination, 307);
}
