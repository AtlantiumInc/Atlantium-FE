// Admin login with email and password
query "admin/login" verb=POST {
  api_group = "administration"

  input {
    email email filters=trim|lower
    password text filters=trim
  }

  stack {
    // Get user by email
    db.get users {
      field_name = "email"
      field_value = $input.email
    } as $user

    !precondition ($user != null) {
      error_type = "accessdenied"
      error = "Invalid credentials"
    }

    // Verify password
    security.password_verify {
      password = $input.password
      hash = $user.password_hash
    } as $password_valid

    !precondition ($password_valid == true) {
      error_type = "accessdenied"
      error = "Invalid credentials"
    }

    // Update last login timestamp
    db.edit users {
      field_name = "id"
      field_value = $user.id
      data = {last_login: "now"}
    }

    // Create auth token
    security.jwt_encode {
      payload = {
        user_id: $user.id
        email: $user.email
        type: "admin"
      }
      secret = $env.jwt_secret
      expiration = 86400
    } as $auth_token
  }

  response = {
    success: true
    auth_token: $auth_token
    user: {
      id: $user.id
      email: $user.email
    }
  }
  history = false
}
