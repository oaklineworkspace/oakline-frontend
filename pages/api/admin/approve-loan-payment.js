export default async function handler(req, res) {
  return res.status(404).json({
    error: 'Admin endpoints are not available in the frontend repository',
    message: 'Please use the admin repository for admin operations'
  });
}