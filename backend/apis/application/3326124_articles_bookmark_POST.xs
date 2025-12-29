// Toggle bookmark status on an article
query "articles/bookmark" verb=POST {
  api_group = "application"
  auth = "users"

  input {
    // Article message ID
    uuid article_id
  
    // Bookmark status
    bool is_bookmarked
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
  
    // Update bookmark in properties
    var $properties {
      value = $article.properties
        |set:"is_bookmarked":$input.is_bookmarked
    }
  
    // Update the article
    db.patch messages {
      field_name = "id"
      field_value = $input.article_id
      data = {properties: $properties, updated_at: now}
    }
  }

  response = {
    success      : true
    article_id   : $input.article_id
    is_bookmarked: $input.is_bookmarked
  }
}