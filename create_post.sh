#!/bin/bash

# 새 포스트 생성 스크립트
# 사용법: ./create_post.sh "포스트 제목"

if [ -z "$1" ]; then
    echo "사용법: ./create_post.sh \"포스트 제목\""
    exit 1
fi

TITLE="$1"
DATE=$(date +%Y-%m-%d)
FILENAME=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
FILEPATH="_posts/${DATE}-${FILENAME}.md"

cat > "$FILEPATH" << EOF
---
title: "${TITLE}"
date: $(date '+%Y-%m-%d %H:%M:%S') +0900
categories: []
tags: []
author: mugeon
---

여기에 내용을 작성하세요.
EOF

echo "✅ 새 포스트가 생성되었습니다: $FILEPATH"