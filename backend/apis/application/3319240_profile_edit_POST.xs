// Update the authenticated user's profile. Only provided fields will be updated.
query "profile/edit" verb=POST {
  api_group = "application"
  auth = "users"

  input {
    // Unique username for the profile
    text username? filters=trim
  
    // Display name shown to other users
    text display_name? filters=trim
  
    // User's first name
    text first_name? filters=trim
  
    // User's last name
    text last_name? filters=trim
  
    // User biography or description
    text bio? filters=trim
  
    // URL to the user's avatar image
    text avatar_url? filters=trim
  
    // User's location
    text location? filters=trim
  
    // User's personal website URL
    text website_url? filters=trim
  }

  stack {
    // Find the profile for the authenticated user
    db.query profiles {
      where = $db.profiles.user_id == $auth.id
      return = {type: "single"}
    } as $profile
  
    // Ensure the profile exists
    precondition ($profile != null) {
      error_type = "inputerror"
      error = "Profile not found for the authenticated user."
    }
  
    // Build the update data object with only provided fields
    var $update_data {
      value = {updated_at: now}
    }
  
    conditional {
      if ($input.username != null) {
        var.update $update_data {
          value = $update_data|set:"username":$input.username
        }
      }
    }
  
    conditional {
      if ($input.display_name != null) {
        var.update $update_data {
          value = $update_data
            |set:"display_name":$input.display_name
        }
      }
    }
  
    conditional {
      if ($input.first_name != null) {
        var.update $update_data {
          value = $update_data
            |set:"first_name":$input.first_name
        }
      }
    }
  
    conditional {
      if ($input.last_name != null) {
        var.update $update_data {
          value = $update_data|set:"last_name":$input.last_name
        }
      }
    }
  
    conditional {
      if ($input.bio != null) {
        var.update $update_data {
          value = $update_data|set:"bio":$input.bio
        }
      }
    }
  
    conditional {
      if ($input.avatar_url != null) {
        var.update $update_data {
          value = $update_data
            |set:"avatar_url":$input.avatar_url
        }
      }
    }
  
    conditional {
      if ($input.location != null) {
        var.update $update_data {
          value = $update_data|set:"location":$input.location
        }
      }
    }
  
    conditional {
      if ($input.website_url != null) {
        var.update $update_data {
          value = $update_data
            |set:"website_url":$input.website_url
        }
      }
    }
  
    // Update existing profile
    db.patch profiles {
      field_name = "id"
      field_value = $profile.id
      data = $update_data
    } as $updated_profile
  }

  response = $updated_profile
}