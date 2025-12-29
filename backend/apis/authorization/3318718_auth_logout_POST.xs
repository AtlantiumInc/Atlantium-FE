// Logout endpoint - client should clear token after this call
query "auth/logout" verb=POST {
  api_group = "authorization"
  auth = "users"

  input {
  }

  stack {
  }

  response = {success: true, message: "Logged out successfully"}
  history = false
}