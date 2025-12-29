// Update an existing article
query "articles/update" verb=POST {
  api_group = "application"
  auth = "users"

  input {
    // Article message ID
    uuid article_id
  
    // Updated article properties as JSON object
    json properties
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
  
    // Update the article message
    db.patch messages {
      field_name = "id"
      field_value = $input.article_id
      data = {
        content   : $input.properties.summary
        properties: $input.properties
        is_edited : true
        updated_at: now
      }
    } as $updated_article
  }

  response = {
    id        : $updated_article.id
    thread_id : $updated_article.thread_id
    properties: $updated_article.properties
    is_edited : true
    updated_at: $updated_article.updated_at
  }
}