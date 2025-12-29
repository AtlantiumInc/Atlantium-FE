// Get authenticated user's profile
query "auth/me" verb=GET {
  api_group = "authorization"
  auth = "users"

  input {
  }

  stack {
    // Get the authenticated user's full record
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user
  
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "User not found"
    }
  }

  response = {
    id               : $user.id
    email            : $user.email
    is_email_verified: $user.is_email_verified
    created_at       : $user.created_at
  }

  history = false
}