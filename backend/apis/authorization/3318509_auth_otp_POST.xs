// Send one-time password to user's email for login
query "auth/otp" verb=POST {
  api_group = "authorization"

  input {
    email email filters=trim|lower
  }

  stack {
    db.has users {
      field_name = "email"
      field_value = $input.email
    } as $user_exists
  
    var $user_id {
      value = null
    }
  
    // Generate 6-digit OTP
    security.random_number {
      min = 100000
      max = 999999
    } as $otp
  
    // Create new user or update existing user
    conditional {
      if ($user_exists == false) {
        // Create new user with OTP
        db.add users {
          data = {
            email            : $input.email
            phone_number     : ""
            password_hash    : ""
            auth_provider    : "email"
            provider_id      : ""
            is_email_verified: false
            is_phone_verified: false
            created_at       : "now"
            updated_at       : "now"
            last_login       : ""
            otp_code         : $otp
            otp_expires_at   : ""
          }
        } as $create_user
      
        var.update $user_id {
          value = $create_user.id
        }
      }
    
      else {
        // Update existing user with new OTP
        db.edit users {
          field_name = "email"
          field_value = $input.email
          data = {otp_code: $otp}
        } as $update_user
      
        var.update $user_id {
          value = $update_user.id
        }
      }
    }
  
    // Create email subject
    var $email_subject {
      value = "Your Atlantium OTP is {OTP}"|replace:"{OTP}":$otp
    }
  
    // Create email body
    var $email_body {
      value = """
        Welcome to Atlantium!
        <br/>
        <br/>
        Here is your ONE TIME PIN: {OTP}
        <br/>
        <br/>
        Thanks,
        <br/>
        Atlantium Team
        """|replace:"{OTP}":$otp
    }
  
    // Send email with OTP via Resend
    api.request {
      url = "https://api.resend.com/emails"
      method = "POST"
      params = {}
        |set:"from":"Atlantium <team@notifications.atlantium.ai>"
        |set:"to":([]|push:$input.email)
        |set:"subject":$email_subject
        |set:"html":$email_body
      headers = []
        |push:("Authorization: Bearer {API-KEY}"
          |replace:"{API-KEY}":$env.resend_api_key
        )
        |push:"Content-Type: application/json"
    } as $resend_api
  
    debug.stop {
      value = $resend_api
    }
  
    !precondition ($resend_api.response.status == 200) {
      error_type = "accessdenied"
      error = "Email failed to send"
    }
  }

  response = {success: true, user_id: $user_id}
  history = false
}