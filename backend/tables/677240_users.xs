table users {
  auth = false

  schema {
    // Unique identifier for the user
    uuid id
  
    // User's email address
    email email filters=trim|lower {
      sensitive = true
    }
  
    // User's phone number
    text phone_number? filters=trim {
      sensitive = true
    }
  
    // Hashed password for email authentication
    text password_hash? filters=trim {
      sensitive = true
    }
  
    // Authentication provider used by the user
    enum auth_provider?=email {
      values = ["email", "google", "apple", "phone"]
    }
  
    // Unique identifier from external auth provider
    text provider_id? filters=trim {
      sensitive = true
    }
  
    // Indicates whether the user's email has been verified
    bool is_email_verified?
  
    // Indicates whether the user's phone number has been verified
    bool is_phone_verified?
  
    // Timestamp when the user account was created
    timestamp created_at?=now
  
    // Timestamp when the user account was last updated
    timestamp updated_at?=now
  
    // Timestamp of the user's last login
    timestamp last_login?
  
    // One-time password code for email authentication
    text otp_code? filters=trim {
      sensitive = true
    }
  
    // Timestamp when the OTP code expires
    timestamp otp_expires_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
    {
      type : "btree|unique"
      field: [{name: "phone_number", op: "asc"}]
    }
    {
      type : "btree|unique"
      field: [{name: "provider_id", op: "asc"}]
    }
  ]
}