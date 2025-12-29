// Delete an article
query "articles/delete" verb=POST {
  api_group = "application"
  auth = "users"

  input {
    // Article message ID
    uuid article_id
  }

  stack {
    // Get the existing article
    db.query messages {
      where = ($db.messages.id == $input.article_id) && ($db.messages.message_type == "article")
      return = {type: "single"}
    } as $article
  
    precondition ($article != null) {
      error_type = "inputerror"
      error = "Article not found"
    }
  
    // Delete the article message
    db.del messages {
      field_name = "id"
      field_value = $input.article_id
    }
  }

  response = {success: true}
}