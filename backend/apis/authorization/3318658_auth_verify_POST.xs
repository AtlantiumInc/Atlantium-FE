// Verify OTP code and complete login
query "auth/verify" verb=POST {
  api_group = "authorization"

  input {
    email email filters=trim|lower
    text code filters=trim
  }

  stack {
    // Find user by email
    db.get users {
      field_name = "email"
      field_value = $input.email
    } as $user
  
    // Check if user exists
    precondition ($user != null) {
      error_type = "inputerror"
      error = "Invalid email or OTP code"
    }
  
    // Check if OTP code matches
    precondition ($user.otp_code == $input.code) {
      error_type = "inputerror"
      error = "Invalid OTP code"
    }
  
    // Update user: clear OTP, mark email verified
    db.edit users {
      field_name = "id"
      field_value = $user.id
      data = {
        otp              : null
        is_email_verified: true
        last_login       : "now"
      }
    } as $updated_user
  
    // Check if user has a profile
    db.query profiles {
      where = $db.profiles.user_id == $user.id
      return = {type: "single"}
    } as $existing_profile
  
    // Create profile if doesn't exist
    conditional {
      if ($existing_profile == null) {
        db.add profiles {
          data = {
            user_id     : $user.id
            username    : $user.email|split:"@"|first
            display_name: $user.email|split:"@"|first
            created_at  : now
            updated_at  : now
          }
        } as $new_profile
      }
    }
  
    // Create JWT auth token (24 hour expiration)
    security.create_auth_token {
      table = "users"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $auth_token
  }

  response = {
    success   : true
    auth_token: $auth_token
    user      : $updated_user
  }

  history = 100
}