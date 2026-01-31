---
title: Spring Batch 2 - 핵심 구조 Job, Step, Flow 완벽 이해
date: 2026-02-01
categories: [스프링]
tags: [스프링, 스프링배치]
author: mugeon
---

# 서론

---

이전 글에서는 스프링 배치의 정의와 실무 사용 사례에 대해서 알아봤습니다. 이번 글에서는 Spring Batch 6의 주요 변경사항과 핵심 구성 요소인 Job, Step, Flow에 대해서 알아보겠습니다.

너무 기초적인 내용보다는 실무에서 필요한 개념 위주로 작성하겠습니다.

# 본론

---

> 이제부터 우리는 물류 도메인 회사에 근무를 한다고 가정하고 모든 내용을 학습하겠습니다.

## Spring Batch 6 핵심 변경사항

Spring Batch 6는 Spring Framework 7과 함께 메이저 업데이트가 되었습니다. 실무에서 마이그레이션할 때 반드시 알아야 할 핵심 변경사항들을 정리했습니다.

### 1. 불변성 강화

Spring Batch 6의 가장 큰 변화는 도메인 모델에 불변성이 도입된 것입니다. `JobInstance`, `JobExecution`, `StepExecution` 같은 핵심 엔티티들이 이제 생성 후 변경할 수 없습니다.

**왜 이렇게 바뀌었을까?**

멀티스레드 환경에서 배치를 실행할 때 여러 스레드가 동시에 같은 엔티티에 접근하면서 race condition이 발생하는 문제가 있었습니다. 불변성을 도입하면서 이런 동시성 문제를 원천적으로 차단했습니다.

기존에는 기본 생성자로 만들고 setter로 값을 설정했다면 이제는 생성 시점에 모든 필수 값을 넣어야 합니다.

```java
// Spring Batch 5 (기존)
JobExecution jobExecution = new JobExecution();
jobExecution.setId(1L);
jobExecution.setStatus(BatchStatus.COMPLETED);

// Spring Batch 6 (변경)
JobExecution jobExecution = new JobExecution(1L, jobParameters);
// 이후 상태 변경 불가! 새로운 객체를 만들어야 함
```

실무에서 테스트 코드 작성할 때 가장 많이 영향을 받았습니다. Mock 객체를 만들 때 생성자 파라미터를 모두 준비해야 해서 초기에는 불편했지만 덕분에 테스트가 더 안정적이게 되었습니다.

또한 엔티티 ID가 `Long` 래퍼 타입에서 `long` 원시 타입으로 변경되었습니다. null 체크가 필요 없어져서 코드가 간결해졌습니다.

**ChunkOrientedStep도 record로 관리**

청크 처리 과정에서 사용하는 내부 데이터 구조들도 record로 변경되었습니다. 이전에는 `Chunk` 클래스가 mutable했지만 이제는 불변 객체로 관리됩니다.

```java
// Spring Batch 6에서 Chunk는 불변
Chunk<String> chunk = new Chunk<>(items);
// chunk에 아이템을 추가하려면 새로운 Chunk를 만들어야 함
```

이로 인해 청크 내부에서 데이터를 수정하는 로직이 있었다면 코드를 변경해야 합니다. 실무에서는 ItemProcessor에서 처리하는 방식으로 개선했습니다.

### 2. JobParameter와 증분기의 철학 (#4910)

Spring Batch 6에서 가장 큰 철학적 변화 중 하나입니다. Spring Batch 5까지 많은 개발자들이 증분기(Incrementer)를 잘못 사용해왔고, 이것이 혼란을 야기했습니다.

**증분기의 본래 목적**

`JobParametersIncrementer`의 본래 목적은 **업무 파라미터가 없는 반복 배치에서 매번 새로운 JobInstance를 만들기 위함**입니다.

```java
@Bean
public Job simpleJob() {
    return jobBuilderFactory.get("simpleJob")
        .incrementer(new RunIdIncrementer())  // run.id로 매번 새로운 JobInstance 생성
        .start(step1())
        .build();
}
```

매일 실행되는 단순 집계 배치 같은 경우 날짜 파라미터 없이 `run.id`만으로 실행합니다.

**Spring Batch 5까지의 안티패턴**

많은 개발자들이 증분기를 잘못 사용했습니다. 업무 파라미터(날짜, 키 등)가 있음에도 불구하고 증분기를 함께 사용하는 패턴이 널리 퍼져있었습니다.

```java
// Spring Batch 5의 안티패턴
@Bean
public Job orderJob() {
    return jobBuilderFactory.get("orderJob")
        .incrementer(new RunIdIncrementer())  // 업무 파라미터와 함께 사용 ❌
        .start(step1())
        .build();
}

JobParameters params = new JobParametersBuilder()
    .addString("date", "2026-01-31")  // 날짜 파라미터
    .toJobParameters();
```

**왜 이렇게 사용했을까?**

재시작은 포기하고 동일 파라미터로 여러 번 Job을 실행하기 위해서였습니다. 급하게 동일 Job을 다시 돌려야 할 때 매번 임시 파라미터를 바꾸지 않고 간편하게 재실행할 수 있었기 때문입니다.

하지만 이것은 트릭이었고, 실패 지점부터 재시작할 수 없다는 큰 단점이 있었습니다. 대용량 데이터를 처리하는 배치에서는 치명적인 문제입니다.

**올바른 사용법**

업무 파라미터가 있다면 증분기를 사용하지 말아야 합니다. 파라미터 자체가 JobInstance의 기준이 되어야 멱등성과 재시작이 제대로 동작합니다.

```java
// 올바른 방식
@Bean
public Job orderShipmentJob() {
    return jobBuilderFactory.get("orderShipmentJob")
        // incrementer 없음!
        .start(step1())
        .build();
}

// 날짜 파라미터로 JobInstance 구분
JobParameters params = new JobParametersBuilder()
    .addString("shippingDate", "2026-01-31")
    .toJobParameters();
```

이렇게 하면 같은 날짜로 재실행할 때 이전 실패 지점부터 재시작할 수 있습니다.

**Spring Batch 6의 명확한 구분 (#4910)**

Spring Batch 6는 이런 혼란을 원천 차단했습니다.

**증분기를 사용하면 다른 모든 파라미터가 무시됩니다.**

```java
// Spring Batch 6
@Bean
public Job orderJob() {
    return jobBuilderFactory.get("orderJob")
        .incrementer(new RunIdIncrementer())
        .start(step1())
        .build();
}

JobParameters params = new JobParametersBuilder()
    .addString("date", "2026-01-31")  // 무시됨!
    .toJobParameters();
// 실제로는 run.id만 사용됨
```

증분기와 업무 파라미터를 섞어 쓸 수 없게 만들어서 안티패턴을 방지했습니다.

**명확한 설계 원칙**

이제 Spring Batch 6의 철학은 명확합니다.

| 상황 | 증분기 사용 | 업무 파라미터 | 재시작 |
|------|------------|-------------|--------|
| 파라미터 없는 반복 배치 | O | X | X |
| 날짜/키 기반 배치 | X | O | O |

출고 배치처럼 날짜별로 처리하고 실패 시 재시작이 필요하다면 날짜 파라미터를 사용하고 증분기는 절대 사용하지 않습니다.

### 3. JobExplorer와 JobLauncher의 통합

기존에 분리되어 있던 기능들이 통합되었습니다.

**JobExplorer → JobRepository로 확장**

이전에는 Job 정보를 조회하려면 `JobExplorer`를 별도로 주입받아야 했습니다. 하지만 Spring Batch 6부터는 `JobRepository`가 `JobExplorer`의 기능을 모두 포함하게 되었습니다.

```java
// Spring Batch 5 (기존)
@Autowired
private JobExplorer jobExplorer;

@Autowired
private JobRepository jobRepository;

List<JobInstance> instances = jobExplorer.getJobInstances("myJob", 0, 10);

// Spring Batch 6 (변경)
@Autowired
private JobRepository jobRepository;

List<JobInstance> instances = jobRepository.getJobInstances("myJob", 0, 10);
```

실무에서 배치 모니터링 화면을 만들 때 `JobExplorer`를 많이 사용했는데 이제는 `JobRepository` 하나로 조회와 저장을 모두 처리할 수 있어서 코드가 간결해졌습니다.

**JobLauncher → JobOperator로 확장**

마찬가지로 `JobOperator`가 `JobLauncher`의 기능을 포함하게 되었습니다. 배치를 실행하고 관리하는 모든 기능이 `JobOperator`로 통합되었습니다.

```java
// Spring Batch 6
@Autowired
private JobOperator jobOperator;

// Job 실행
Long executionId = jobOperator.start("myJob", "date=2026-01-31");

// Job 중지
jobOperator.stop(executionId);

// Job 재시작
jobOperator.restart(executionId);
```

운영 환경에서 배치를 수동으로 중지하거나 재시작할 때 `JobOperator`를 사용하면 편리합니다.

### 4. 데이터베이스 스키마 변경

데이터베이스 스키마가 변경되었습니다. 특히 시퀀스 이름이 바뀌었습니다.

- `BATCH_JOB_SEQ` → `BATCH_JOB_INSTANCE_SEQ`
- `BATCH_STEP_SEQ` → `BATCH_STEP_EXECUTION_SEQ`

실무에서 운영 DB에 마이그레이션할 때 주의해야 할 점들이 있습니다.

**마이그레이션 순서**
1. 운영 중인 배치를 모두 중지
2. 백업 생성
3. 마이그레이션 스크립트 실행
4. 테스트 배치 실행으로 검증
5. 운영 재개

```sql
-- Oracle 예시
ALTER SEQUENCE BATCH_JOB_SEQ RENAME TO BATCH_JOB_INSTANCE_SEQ;
ALTER SEQUENCE BATCH_STEP_SEQ RENAME TO BATCH_STEP_EXECUTION_SEQ;
```

공식 마이그레이션 스크립트는 각 DB별로 제공됩니다. 저는 PostgreSQL을 사용했는데 스크립트를 그대로 실행하니 문제없이 마이그레이션되었습니다.

**테이블 구조 변경은 없음**

다행히 테이블 컬럼이나 구조는 변경되지 않았습니다. 시퀀스 이름만 바뀌어서 마이그레이션이 비교적 간단했습니다.

### 5. 설정 및 청크 처리 변경

**설정 방식**

`@EnableBatchProcessing`에서 JDBC 관련 설정이 분리되었습니다.

```java
// JDBC 사용
@EnableJdbcJobRepository
public class BatchConfig extends JdbcDefaultBatchConfiguration {}

// MongoDB 사용
@EnableMongoJobRepository
public class BatchConfig extends MongoDefaultBatchConfiguration {}
```

**청크 처리**

트랜잭션 매니저 설정이 메서드 체이닝 방식으로 변경되었습니다.

```java
// Spring Batch 5
.<String, String>chunk(10, transactionManager)

// Spring Batch 6
.<String, String>chunk(10)
    .transactionManager(transactionManager)
```

**참고**

공식 마이그레이션 가이드: https://github.com/spring-projects/spring-batch/wiki/Spring-Batch-6.0-Migration-Guide

## Meta Table

Spring Batch는 모든 배치 작업의 실행 결과와 상태 정보를 메타데이터 테이블에 저장합니다. JobInstance, JobExecution, StepExecution 등의 정보가 여기에 저장되고 이를 통해 재시작, 실패 추적, 실행 이력 조회가 가능합니다.

### JDBC 기반 메타데이터

MySQL이나 PostgreSQL 같은 RDBMS를 사용할 때는 스키마 초기화가 간단합니다.

공식 문서에서 제공하는 DDL 스크립트를 사용하면 됩니다. 주요 테이블은 다음과 같습니다.

- `BATCH_JOB_INSTANCE`: Job의 논리적 실행 단위
- `BATCH_JOB_EXECUTION`: Job의 물리적 실행 정보
- `BATCH_STEP_EXECUTION`: Step의 실행 정보
- `BATCH_JOB_EXECUTION_PARAMS`: Job 파라미터

**StepExecution과 StepContribution의 관계**

![사진](https://velog.velcdn.com/images/geon_km/post/9fcab289-de6a-4b56-937b-945119d10d86/image.png)

메타데이터 테이블을 처음 보면 어떤 개념인지 헷갈리지만, StepExecution과 StepContribution의 관계를 이해하면 스프링 배치의 청크 처리 핵심을 이해할 수 있습니다.

**멀티스레드 환경에서의 공유**

- `StepExecution`: 워커 스레드 간에 **공유 가능**
- `StepContribution`: 각 스레드가 **독립적으로 소유**

각 스레드는 자신만의 `StepContribution`을 가지고 있어야 합니다. 여기에는 해당 스레드가 처리한 read count, write count, skip count 등이 기록됩니다. 매니저 스텝이 이런 개별 카운터들을 집계하여 최종 StepExecution에 반영합니다.

```
[Thread 1] StepContribution: read=100, write=100
[Thread 2] StepContribution: read=100, write=100
[Thread 3] StepContribution: read=100, write=100
            ↓ 집계
[Manager] StepExecution: read=300, write=300
```

이 설계 덕분에 멀티스레드 환경에서도 안전하게 카운터를 관리할 수 있습니다. 1편에서 소개한 #5188 이슈가 바로 이 부분의 race condition을 해결한 것입니다.

### MongoDB 기반 메타데이터

Spring Batch 6부터 MongoDB를 JobRepository로 사용할 수 있습니다. 하지만 JDBC와 달리 자동 초기화가 지원되지 않습니다.

**왜 자동 초기화가 안 될까?**

MongoDB 초기화 스크립트는 SQL이 아닌 JavaScript 파일이라서 Spring Boot의 자동 초기화 메커니즘이 동작하지 않습니다. 따라서 수동으로 초기화해야 합니다.

**수동 초기화 방법**

MongoTemplate을 사용하여 시퀀스 컬렉션을 초기화해야 합니다.

```java
@Configuration
public class MongoJobRepositoryConfig {

    @Bean
    public JobRepository jobRepository(MongoTemplate mongoTemplate,
                                      MongoTransactionManager transactionManager) throws Exception {
        // 시퀀스 초기화
        initializeSequences(mongoTemplate);

        MongoJobRepositoryFactoryBean factory = new MongoJobRepositoryFactoryBean();
        factory.setMongoOperations(mongoTemplate);
        factory.setTransactionManager(transactionManager);
        factory.afterPropertiesSet();
        return factory.getObject();
    }

    private void initializeSequences(MongoTemplate mongoTemplate) {
        // BATCH_JOB_INSTANCE_SEQ 초기화
        if (!mongoTemplate.collectionExists("SEQUENCE")) {
            mongoTemplate.createCollection("SEQUENCE");
        }

        Document jobSeq = new Document()
            .append("_id", "BATCH_JOB_INSTANCE_SEQ")
            .append("value", 0L);

        Document stepSeq = new Document()
            .append("_id", "BATCH_STEP_EXECUTION_SEQ")
            .append("value", 0L);

        mongoTemplate.insert(jobSeq, "SEQUENCE");
        mongoTemplate.insert(stepSeq, "SEQUENCE");
    }
}
```

실무에서 MongoDB를 사용할 때는 애플리케이션 시작 시 한 번만 초기화하면 됩니다. Docker 환경이라면 init 스크립트로 처리할 수도 있습니다.

**참고 자료**

MongoDB JobRepository 예시: https://github.com/spring-projects/spring-batch/blob/main/spring-batch-core/src/test/java/org/springframework/batch/core/repository/support/MongoDBJobRepositoryIntegrationTests.java

## Job

Job은 배치 처리의 최상위 단위입니다. 하나의 Job은 여러 개의 Step으로 구성되고, 각 Step이 순차적으로 실행되면서 배치 작업이 완료됩니다.

### JobBuilder 사용법

Spring Batch 6에서는 JobBuilder 사용 방식이 변경되었습니다.

```java
// Spring Batch 6
@Bean
public Job orderShipmentJob(JobRepository jobRepository, Step step1, Step step2) {
    return new JobBuilder("orderShipmentJob", jobRepository)
        .start(step1)
        .next(step2)
        .build();
}
```

Spring Batch 5와의 차이점은 jobName을 생성자에서 명시적으로 전달한다는 것입니다. 이전에는 별도 메서드로 지정했습니다.

### SimpleJob vs FlowJob

Job에는 크게 두 가지 타입이 있습니다.

```
Job (interface)
  └── AbstractJob
        ├── SimpleJob (순차적 Step 실행)
        └── FlowJob (조건부 실행)
```

**SimpleJob**

가장 많이 사용하는 타입입니다. 여러 Step을 순차적으로 실행하고, 모든 Step이 성공해야 Job이 성공합니다. 마지막 Step의 BatchStatus가 Job의 Status가 됩니다.

```java
@Bean
public Job simpleJob(JobRepository jobRepository) {
    return new JobBuilder("simpleJob", jobRepository)
        .start(step1())
        .next(step2())
        .next(step3())
        .build();
}
```

**FlowJob**

조건에 따라 다른 Step을 실행할 수 있습니다. 다음 글에서 자세히 다루겠습니다.

### preventRestart

재시작을 방지하는 설정입니다. 기본적으로는 재시작이 허용되지만, `preventRestart()`를 설정하면 재시작이 불가능해집니다.

```java
@Bean
public Job orderJob(JobRepository jobRepository) {
    return new JobBuilder("orderJob", jobRepository)
        .start(step1())
        .next(step2())
        .preventRestart()  // 재시작 방지
        .build();
}
```

**사용 예시**

step1, step2가 있고 step2에서 예외가 발생했다고 가정합니다.

- `preventRestart()` 없음: step2부터 재시작 가능
- `preventRestart()` 있음: 재시작 시도 시 `IllegalStateException` 발생

실무에서는 한 번만 실행되어야 하는 정산 배치나 마이그레이션 배치에서 사용합니다.

### JobParametersValidator

Job 실행에 필요한 파라미터를 검증합니다.

```java
@Bean
public Job orderJob(JobRepository jobRepository) {
    return new JobBuilder("orderJob", jobRepository)
        .start(step1())
        .validator(new DefaultJobParametersValidator(
            new String[]{"date", "version"},  // 필수 파라미터
            new String[]{"force"}             // 선택 파라미터
        ))
        .build();
}
```

**커스텀 Validator**

더 복잡한 검증이 필요하면 직접 구현할 수 있습니다.

```java
@Component
public class CustomJobParametersValidator implements JobParametersValidator {

    @Override
    public void validate(JobParameters parameters) throws JobParametersInvalidException {
        String date = parameters.getString("date");

        if (date == null) {
            throw new JobParametersInvalidException("date 파라미터는 필수입니다.");
        }

        // 날짜 형식 검증
        try {
            LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new JobParametersInvalidException("date 형식이 올바르지 않습니다. (yyyy-MM-dd)");
        }
    }
}
```

검증은 두 번 실행됩니다.

1. `TaskExecutorJobLauncher`에서 검증
2. `AbstractJob`에서 검증


### AbstractJob의 실행 흐름

AbstractJob은 SimpleJob과 FlowJob의 부모 클래스입니다. `execute()` 메서드를 보면 Spring Batch의 실행 흐름을 이해할 수 있습니다.

```java
@Override
public final void execute(JobExecution execution) {
    // 1. JobContext 등록 (JobScope 지원)
    JobSynchronizationManager.register(execution);

    try {
        // 2. 파라미터 검증
        validator.validate(execution.getJobParameters());

        // 3. 상태 확인
        if (execution.getStatus() != BatchStatus.STOPPING) {
            // 4. beforeJob 리스너 호출
            listener.beforeJob(execution);

            // 5. 실제 실행 (SimpleJob/FlowJob에서 구현)
            doExecute(execution);
        }
    } catch (JobInterruptedException e) {
        execution.setStatus(BatchStatus.STOPPED);
    } catch (Exception e) {
        execution.setStatus(BatchStatus.FAILED);
    } finally {
        // 6. afterJob 리스너 호출 및 컨텍스트 정리
        listener.afterJob(execution);
        JobSynchronizationManager.release();
    }
}
```

Spring Batch를 보면 비슷한 패턴이 반복됩니다. `execute()` 메서드와 `SynchronizationManager`가 핵심입니다. 결국 excute()를 통해 SimpleJob에 doExcute()를 호출하여 Step을 순차적으로 수행합니다. 
```java
  @Override                                                                                                             
  protected void doExecute(JobExecution execution) {                                                                    
      StepExecution stepExecution = null;                                                                               
                                                                                                                        
      // Step들을 순차적으로 실행                                                                                       
      for (Step step : steps) {                                                                                         
          stepExecution = handleStep(step, execution);  // AbstractJob.handleStep() 호출                                
                                                                                                                        
          // Step이 COMPLETED가 아니면 Job 종료                                                                         
          if (stepExecution.getStatus() != BatchStatus.COMPLETED) {                                                     
              break;  // 실패하면 다음 Step 실행 안 함                                                                  
          }                                                                                                             
      }                                                                                                                 
                                                                                                                        
      // Job 상태를 마지막 Step의 상태로 설정                                                                           
      if (stepExecution != null) {                                                                                      
          execution.upgradeStatus(stepExecution.getStatus());                                                           
          execution.setExitStatus(stepExecution.getExitStatus());                                                       
      }                                                                                                                 
  }       
```

## Step

Step은 Job을 구성하는 독립적인 실행 단위입니다. 하나의 Job은 여러 개의 Step으로 구성되고, 각 Step은 자신만의 책임을 가지고 독립적으로 실행됩니다.

### StepBuilder 타입

StepBuilder는 Step의 종류에 따라 다양한 빌더를 제공합니다.

**TaskletStepBuilder**

가장 단순한 형태의 Step입니다. 개발자가 직접 작성한 로직을 실행합니다.

```java
@Bean
public Step customTaskletStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("customTaskletStep", jobRepository)
        .tasklet((contribution, chunkContext) -> {
            // 직접 작성한 비즈니스 로직 실행
            return RepeatStatus.FINISHED;
        }, transactionManager)
        .build();
}
```

실무에서는 단순한 파일 삭제, API 호출, 상태 업데이트 같은 작업에 사용합니다. 물류 시스템에서 출고 완료 후 알림톡을 보내는 Step을 Tasklet으로 구현하면 적절합니다.

**SimpleStepBuilder**

청크 기반 처리를 위한 Step입니다. ItemReader, ItemProcessor, ItemWriter를 조합하여 대용량 데이터를 청크 단위로 처리합니다. 내부적으로는 ChunkOrientedTasklet을 사용합니다.

```java
@Bean
public Step chunkStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("chunkStep", jobRepository)
        .<Order, ShippingLabel>chunk(100, transactionManager)
        .reader(orderReader())
        .processor(shippingLabelProcessor())
        .writer(shippingLabelWriter())
        .build();
}
```

대부분의 배치는 이 방식으로 작성합니다. 10만 건의 주문을 처리한다면 100개씩 묶어서 읽고, 변환하고, 저장하는 방식으로 메모리를 효율적으로 사용할 수 있습니다. 청크 처리는 다음 글에서 자세히 다루겠습니다.

**PartitionStepBuilder**

멀티스레드로 Step을 병렬 실행합니다. 하나의 Step을 여러 파티션으로 나누어 동시에 처리하기 때문에 대용량 데이터를 빠르게 처리할 수 있습니다.

**JobStepBuilder**

Step 안에서 다른 Job을 실행합니다. 복잡한 배치를 작은 Job들로 분리하고 조합할 때 사용합니다.

**FlowStepBuilder**

Step 안에서 Flow를 실행합니다. Flow는 조건부 Step 실행을 위한 개념으로 이번 글 뒷부분에서 다루겠습니다.

### startLimit

Step의 최대 실행 횟수를 제한합니다. 기본값은 `Integer.MAX_VALUE`로 제한이 없습니다.

```java
@Bean
public Step step1(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("step1", jobRepository)
        .tasklet(tasklet, transactionManager)
        .startLimit(3)  // 최대 3회까지만 실행 가능
        .build();
}
```

재시작 가능한 배치에서 특정 Step이 반복 실패하면 무한 루프에 빠질 수 있습니다. `startLimit`을 설정하면 설정값을 초과할 때 `StartLimitExceededException`이 발생하면서 배치가 중단됩니다.

실무에서는 외부 API 호출 Step에 사용합니다. API가 장애 상태라면 몇 번 재시도 후 빠르게 실패하도록 하여 불필요한 대기 시간을 줄일 수 있습니다.

### allowStartIfComplete()

Job을 재시작할 때 이미 성공한 Step은 기본적으로 건너뜁니다. 하지만 `allowStartIfComplete(true)`를 설정하면 성공 여부와 관계없이 매번 실행됩니다.

```java
@Bean
public Step validationStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("validationStep", jobRepository)
        .tasklet((contribution, chunkContext) -> {
            // 데이터 검증 로직
            validateShipmentData();
            return RepeatStatus.FINISHED;
        }, transactionManager)
        .allowStartIfComplete(true)  // 재시작 시에도 항상 실행
        .build();
}
```

**언제 사용할까?**

매번 실행되어야 하는 검증이나 초기화 작업에 사용합니다. 출고 배치에서 전날 데이터의 정합성을 검사하는 Step이라면 재시작 시에도 다시 검증해야 안전합니다.

```
[첫 실행]
Step1(검증) → SUCCESS
Step2(처리) → FAILED

[재시작]
Step1 → allowStartIfComplete(false)이면 스킵
Step1 → allowStartIfComplete(true)이면 다시 실행 ✓
Step2 → 이어서 실행
```

실무에서는 파일 존재 여부 확인, 권한 체크, 외부 시스템 연결 상태 확인 같은 Step에 사용합니다.


## Flow

Flow는 Step의 실행 흐름을 조건에 따라 제어하는 기능입니다. SimpleJob은 Step을 순차적으로만 실행하지만 FlowJob을 사용하면 Step의 실행 결과에 따라 다음 실행할 Step을 동적으로 결정할 수 있습니다.

### 왜 Flow가 필요할까?

실무에서는 이전 Step의 결과에 따라 다른 처리가 필요한 경우가 많습니다.

**물류 시스템 예시**

출고 배치를 실행할 때 재고 확인 Step이 실패하면 두 가지 선택지가 있습니다.
- 재고 부족 알림을 보내고 정상 종료
- 긴급 입고 배치를 실행하고 출고 재시도

이런 분기 처리를 Flow로 구현할 수 있습니다.

### Flow 기본 사용법

Flow API는 Step의 ExitStatus를 패턴 매칭하여 다음 실행할 Step을 결정합니다.

```java
@Bean
public Job orderShipmentJob(JobRepository jobRepository) {
    return new JobBuilder("orderShipmentJob", jobRepository)
        .start(checkInventoryStep())
        .on("COMPLETED").to(shipOrderStep())          // 재고 충분하면 출고
        .from(checkInventoryStep())
        .on("INSUFFICIENT").to(notifyStep())          // 재고 부족하면 알림
        .end()
        .build();
}
```

**주요 API**

- `on(String pattern)`: Step의 ExitStatus와 매칭. 패턴 사용 가능
  - `*`: 0개 이상 문자 매칭 (모든 상태)
  - `?`: 정확히 1개 문자 매칭
  - `COMPLE*`: COMPLETED, COMPLETING 등 매칭

- `to(Step)`: 다음 실행할 Step 지정

- `from(Step)`: 이전 Step에서 새로운 조건 추가

### Flow와 Step 조합

Flow 안에 여러 Step을 묶어서 재사용할 수 있습니다.

```java
@Bean
public Job shipmentJob(JobRepository jobRepository) {
    return new JobBuilder("shipmentJob", jobRepository)
        .start(preparationFlow())              // Flow 실행
        .next(shipmentStep())
        .on("COMPLETED").to(completeStep())
        .on("FAILED").to(rollbackStep())
        .end()
        .build();
}

@Bean
public Flow preparationFlow() {
    return new FlowBuilder<Flow>("preparationFlow")
        .start(validateOrderStep())
        .next(checkInventoryStep())
        .next(reserveInventoryStep())
        .build();
}
```

preparationFlow는 주문 검증, 재고 확인, 재고 예약을 순차적으로 수행합니다. 이 Flow를 하나의 단위로 취급하여 다른 Job에서도 재사용할 수 있습니다.

**로그 확인**

```
Executing step: [validateOrderStep]
Step: [validateOrderStep] executed in 25ms
Executing step: [checkInventoryStep]
Step: [checkInventoryStep] executed in 31ms
Executing step: [reserveInventoryStep]
Step: [reserveInventoryStep] executed in 28ms
Executing step: [shipmentStep]
Step: [shipmentStep] executed in 45ms
```

### Flow 종료 API

Flow의 실행을 제어하는 4가지 종료 API가 있습니다. 이 API들은 Step의 상태와 무관하게 Job의 최종 상태를 결정합니다.

**stop()**

Job을 중지 상태로 종료합니다. 재시작이 가능합니다.

```java
@Bean
public Job orderJob(JobRepository jobRepository) {
    return new JobBuilder("orderJob", jobRepository)
        .start(validateStep())
        .on("INVALID").stop()                  // 검증 실패 시 중지
        .from(validateStep())
        .on("COMPLETED").to(processStep())
        .end()
        .build();
}
```

검증이 실패하면 Job이 STOPPED 상태로 종료되고, 문제를 수정한 후 재시작할 수 있습니다.

**fail()**

Job을 실패 상태로 종료합니다.

```java
@Bean
public Job criticalJob(JobRepository jobRepository) {
    return new JobBuilder("criticalJob", jobRepository)
        .start(criticalStep())
        .on("FAILED").fail()                   // 실패 시 Job도 실패
        .from(criticalStep())
        .on("COMPLETED").to(nextStep())
        .end()
        .build();
}
```

중요한 Step이 실패하면 Job 전체를 실패로 처리하여 운영팀에 즉시 알림을 보낼 수 있습니다.

**end()**

Flow를 정상 종료합니다. Step이 실패해도 Job은 성공으로 처리됩니다.

```java
@Bean
public Job optionalProcessJob(JobRepository jobRepository) {
    return new JobBuilder("optionalProcessJob", jobRepository)
        .start(mainStep())
        .on("COMPLETED").to(optionalStep())
        .on("FAILED").end()                    // 선택적 처리 실패해도 성공
        .end()
        .build();
}
```

mainStep이 실패해도 Job은 COMPLETED로 처리됩니다. 재시작이 불가능합니다.

**언제 사용할까?**

데이터 마이그레이션 배치에서 선택적 데이터 변환이 실패해도 전체 마이그레이션은 성공으로 간주하고 싶을 때 사용합니다.

**stopAndRestart(Step)**

특정 Step을 STOPPED로 저장하고, 재시작 시 그 Step부터 실행합니다.

```java
@Bean
public Job longRunningJob(JobRepository jobRepository) {
    return new JobBuilder("longRunningJob", jobRepository)
        .start(prepareStep())
        .on("COMPLETED").to(heavyProcessStep())
        .on("FAILED").stopAndRestart(prepareStep())  // prepareStep부터 재시작
        .end()
        .build();
}
```

대용량 처리 Step이 실패하면 준비 단계부터 다시 시작할 수 있습니다.

### 배치 상태 유형

Spring Batch에는 세 가지 상태 개념이 있습니다. 처음에는 헷갈리지만 각각의 역할이 명확합니다.

**BatchStatus**

Job이나 Step의 현재 실행 상태입니다. 스프링 배치 내부에서 관리합니다.

```
STARTING → STARTED → COMPLETED
                  → FAILED
                  → STOPPED
```

이 상태는 개발자가 직접 설정하지 않고 Spring Batch가 자동으로 관리합니다.

**ExitStatus**

Job이나 Step이 어떤 상태로 종료되었는지를 나타냅니다. 개발자가 커스텀할 수 있습니다.

```java
@Bean
public Step checkInventoryStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("checkInventoryStep", jobRepository)
        .tasklet((contribution, chunkContext) -> {
            int inventory = checkInventory();

            if (inventory < 10) {
                // 커스텀 ExitStatus 설정
                contribution.setExitStatus(new ExitStatus("INSUFFICIENT"));
            }

            return RepeatStatus.FINISHED;
        }, transactionManager)
        .build();
}
```

`INSUFFICIENT`라는 커스텀 ExitStatus를 설정하면 Flow에서 이 상태를 기준으로 분기할 수 있습니다.

**FlowExecutionStatus**

Flow의 실행 결과 상태입니다. Flow 내부 Step들의 ExitStatus를 취합하여 결정됩니다.

```
COMPLETED, STOPPED, FAILED, UNKNOWN
```

FlowJob의 최종 BatchStatus는 마지막 Flow의 FlowExecutionStatus로 결정됩니다.

**SimpleJob vs FlowJob 차이**

```java
// SimpleJob
Step1 (COMPLETED) → Step2 (FAILED)
Job BatchStatus = FAILED (마지막 Step 상태)

// FlowJob
Flow1: Step1 (COMPLETED) → Step2 (COMPLETED) → FlowExecutionStatus = COMPLETED
Flow2: Step3 (FAILED) → FlowExecutionStatus = FAILED
Job BatchStatus = FAILED (마지막 Flow 상태)
```

### 커스텀 ExitStatus 활용

실무에서는 비즈니스 상황에 맞는 커스텀 ExitStatus를 만들어 사용합니다.

```java
@Bean
public Job shippingJob(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new JobBuilder("shippingJob", jobRepository)
        .start(checkInventoryStep(jobRepository, transactionManager))
        .on("SUFFICIENT").to(normalShipStep(jobRepository, transactionManager))
        .from(checkInventoryStep(jobRepository, transactionManager))
        .on("INSUFFICIENT").to(urgentPurchaseStep(jobRepository, transactionManager))
        .from(checkInventoryStep(jobRepository, transactionManager))
        .on("OUT_OF_STOCK").to(notifyCustomerStep(jobRepository, transactionManager))
        .end()
        .build();
}

@Bean
public Step checkInventoryStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
    return new StepBuilder("checkInventoryStep", jobRepository)
        .tasklet((contribution, chunkContext) -> {
            int inventory = getInventoryCount();

            if (inventory >= 100) {
                contribution.setExitStatus(new ExitStatus("SUFFICIENT"));
            } else if (inventory > 0) {
                contribution.setExitStatus(new ExitStatus("INSUFFICIENT"));
            } else {
                contribution.setExitStatus(new ExitStatus("OUT_OF_STOCK"));
            }

            return RepeatStatus.FINISHED;
        }, transactionManager)
        .build();
}

private int getInventoryCount() {
    // 실제로는 DB 조회
    return 50;
}
```

재고 수량에 따라 세 가지 경로로 분기합니다.
- 충분: 일반 출고
- 부족: 긴급 입고 후 출고
- 재고 없음: 고객에게 알림

**메타 테이블 확인**

```sql
-- BATCH_STEP_EXECUTION
| STEP_NAME           | STATUS    | EXIT_CODE     |
|---------------------|-----------|---------------|
| checkInventoryStep  | COMPLETED | INSUFFICIENT  |
| urgentPurchaseStep  | COMPLETED | COMPLETED     |
```

Step은 COMPLETED지만 ExitCode는 INSUFFICIENT로 기록됩니다.

### JobExecutionDecider

Step과 완전히 분리하여 Flow 분기 로직을 처리하는 방법입니다. Step의 비즈니스 로직과 분기 로직을 분리할 수 있습니다.

```java
@Component
public class ShippingMethodDecider implements JobExecutionDecider {

    @Override
    public FlowExecutionStatus decide(JobExecution jobExecution, StepExecution stepExecution) {
        // Job 파라미터에서 배송 방법 결정
        String region = jobExecution.getJobParameters().getString("region");

        if ("SEOUL".equals(region)) {
            return new FlowExecutionStatus("QUICK");      // 당일배송
        } else if ("JEJU".equals(region)) {
            return new FlowExecutionStatus("FERRY");      // 선박배송
        } else {
            return new FlowExecutionStatus("STANDARD");   // 일반배송
        }
    }
}
```

**Decider 사용**

```java
@Bean
public Job deliveryJob(JobRepository jobRepository, ShippingMethodDecider decider) {
    return new JobBuilder("deliveryJob", jobRepository)
        .start(prepareOrderStep())
        .next(decider)                                    // Decider로 분기
        .on("QUICK").to(quickDeliveryStep())
        .from(decider).on("FERRY").to(ferryDeliveryStep())
        .from(decider).on("STANDARD").to(standardDeliveryStep())
        .end()
        .build();
}
```

**Decider vs Step ExitStatus 비교**

| | Step ExitStatus | JobExecutionDecider |
|---|---|---|
| 용도 | Step 실행 결과로 분기 | 별도 로직으로 분기 |
| 의존성 | Step에 분기 로직 포함 | 완전히 분리 |
| 재사용 | 어려움 | 쉬움 |
| 적합한 경우 | 실행 결과 기반 분기 | 파라미터나 외부 조건 기반 분기 |

실무에서는 Step의 실행 결과가 아닌 외부 조건(시간대, 지역, 설정값)으로 분기해야 할 때 Decider를 사용합니다.

**조건 로직의 복잡도가 높을 때**

```java
@Component
public class BusinessHourDecider implements JobExecutionDecider {

    @Override
    public FlowExecutionStatus decide(JobExecution jobExecution, StepExecution stepExecution) {
        LocalTime now = LocalTime.now();
        DayOfWeek dayOfWeek = LocalDate.now().getDayOfWeek();

        // 영업시간 체크
        boolean isBusinessHour = now.isAfter(LocalTime.of(9, 0))
                              && now.isBefore(LocalTime.of(18, 0));
        boolean isWeekday = dayOfWeek != DayOfWeek.SATURDAY
                         && dayOfWeek != DayOfWeek.SUNDAY;

        if (isBusinessHour && isWeekday) {
            return new FlowExecutionStatus("REALTIME");    // 실시간 처리
        } else {
            return new FlowExecutionStatus("BATCH");       // 배치 처리
        }
    }
}
```

이런 복잡한 조건 로직을 Step 안에 넣으면 테스트와 유지보수가 어렵습니다. Decider로 분리하면 독립적으로 테스트할 수 있습니다.

# 결론

---

Spring Batch 6의 핵심 변경사항과 Job, Step, Flow의 동작 원리를 살펴봤습니다.

**Spring Batch 6 마이그레이션**

불변성 강화로 멀티스레드 환경에서의 안정성이 크게 향상되었습니다. JobParametersIncrementer의 철학이 명확해지면서 안티패턴을 원천 차단했고, JobExplorer와 JobLauncher가 통합되면서 코드가 간결해졌습니다. 운영 환경에서 마이그레이션할 때는 데이터베이스 시퀀스 변경을 주의해야 합니다.

**Job과 Step 구조**

AbstractJob의 execute() 메서드를 보면 Spring Batch의 실행 흐름을 이해할 수 있습니다. JobSynchronizationManager와 StepSynchronizationManager는 트랜잭션이 아닌 Scope 관리를 담당하고, 이것이 다음 글에서 다룰 @JobScope와 @StepScope의 핵심입니다.

Step은 독립적인 실행 단위로 Tasklet과 Chunk 기반으로 나뉩니다. startLimit으로 무한 재시도를 방지하고, allowStartIfComplete()로 검증 Step을 매번 실행할 수 있습니다.

**Flow를 통한 분기 처리**

실무에서는 단순 순차 실행보다 조건부 분기가 필요한 경우가 많습니다. 재고 확인 결과에 따라 일반 출고와 긴급 입고로 분기하거나, 지역에 따라 배송 방법을 다르게 처리하는 것이 Flow의 역할입니다.

커스텀 ExitStatus로 비즈니스 상황을 표현하고, JobExecutionDecider로 Step과 분기 로직을 분리하면 유지보수가 쉬워집니다. BatchStatus, ExitStatus, FlowExecutionStatus의 차이를 이해하면 복잡한 배치도 안정적으로 제어할 수 있습니다.
