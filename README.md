<div align="center">

# Geon.archive

Backend Engineer의 기술 블로그

[![Deploy](https://github.com/KMGeon/KMGeon.github.io/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/KMGeon/KMGeon.github.io/actions/workflows/pages/pages-build-deployment)
[![GitHub](https://img.shields.io/github/license/KMGeon/KMGeon.github.io?color=blue)](LICENSE)

[**Blog** →](https://kmgeon.github.io)

</div>

## About

Spring Boot/Kotlin 기반의 고가용성 백엔드 시스템을 설계하고 자동화하는 백엔드 엔지니어 황보규민입니다.

초당 수천 건의 이벤트를 처리하는 CDC pipeline 구축, 대용량 배치 작업 95.4% 성능 개선, 브랜드별 CI/CD 파이프라인 구축, Redis Stream 기반의 메시징 시스템 설계 등 다양한 프로젝트를 통해 운영 자동화와 시스템 효율 극대화를 목표로 개발해왔습니다.

## Tech Stack

- **Backend**: Java, Kotlin, Spring Boot, Spring Batch
- **Database**: MySQL, PostgreSQL, Redis
- **Infra**: AWS (ECS, Aurora, ElastiCache), Docker, Kubernetes
- **Message**: Redis Stream, Kafka

## Blog Structure

```
docs/
├── book/           # 도서 리뷰 및 정리
├── database/       # 데이터베이스 관련 글
├── infra/          # 인프라 및 DevOps
├── server/         # 서버 개발 관련
├── spring/         # Spring Framework
└── spring-batch/   # Spring Batch 시리즈
```

## Features

- Just the Docs 테마 기반
- Mermaid 다이어그램 지원
- 검색 기능
- 방문자 카운터 (Busuanzi)
- 반응형 디자인
- 커스텀 코드 블록 스타일링

## Local Development

```bash
# Install dependencies
bundle install

# Run local server
bundle exec jekyll serve
```

## Contact

- GitHub: [@KMGeon](https://github.com/KMGeon)
- LinkedIn: [mugeon](https://www.linkedin.com/in/mugeon)

## License

This project is licensed under the MIT License.
