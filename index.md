---
layout: default
title: About Me
nav_order: 1
description: "Geon.archive - Server Development Blog"
permalink: /
---

<div class="about-container">
  <div class="about-content">
    <div class="about-card">
      <h2>About</h2>
      <p>
        안녕하세요. 백엔드 개발자 <strong>김무건</strong>입니다.
      </p>
      <p>
        실무에서 겪은 문제와 해결 과정, 그리고 그 속에서 얻은 인사이트를 기록하고 공유합니다.
        기록을 통해 지식을 체계화하고, 나중에 다시 참고할 수 있는 자료로 남기고자 합니다.
      </p>
    </div>

    <div class="about-card">
      <h2>Interests</h2>
      <div class="tag-list">
        <span class="tag">Spring</span>
        <span class="tag">Spring Batch</span>
        <span class="tag">JPA</span>
        <span class="tag">MySQL</span>
        <span class="tag">Redis</span>
        <span class="tag">Kafka</span>
        <span class="tag">AWS</span>
        <span class="tag">Docker</span>
      </div>
    </div>

    <div class="about-card">
      <h2>Open Source Contribution</h2>
      <div class="oss-project">
        <h3><a href="https://github.com/spring-projects/spring-batch" target="_blank">spring-batch</a></h3>
        <ul class="oss-list">
          <li><a href="https://github.com/spring-projects/spring-batch/issues/5188" target="_blank">#5188</a> - 병렬 청크 처리 시 <code>StepContribution</code>의 <code>filterCount</code>, <code>processSkipCount</code>에서 발생하는 race condition 수정</li>
          <li><strong>Regression Bug 수정</strong>
            <ul>
              <li><a href="https://github.com/spring-projects/spring-batch/issues/5220" target="_blank">#5220</a> - <code>MongoStepExecutionDao.countStepExecutions()</code>에서 <code>stepName</code> 파라미터가 무시되어 <code>startLimit</code> 기능이 동작하지 않는 버그 수정</li>
              <li><a href="https://github.com/spring-projects/spring-batch/issues/5238" target="_blank">#5238</a> - <code>SimpleStepExecutionSplitter</code>에서 COMPLETED 파티션이 <code>allowStartIfComplete=true</code>여도 재시작되지 않는 버그 수정</li>
            </ul>
          </li>
          <li><a href="https://github.com/spring-projects/spring-batch/issues/5217" target="_blank">#5217</a> - Graceful shutdown 시 race condition으로 인한 <code>OptimisticLockingFailureException</code> 발생 버그 수정</li>
          <li><a href="https://github.com/spring-projects/spring-batch/issues/5247" target="_blank">#5247</a>, <a href="https://github.com/spring-projects/spring-batch/issues/5210" target="_blank">#5210</a> - ChunkOrientedStep의 fault-tolerant 모드에서 스캔 전 트랜잭션 롤백 누락으로 인한 데이터 중복 삽입 및 rollbackCount 오류 수정</li>
          <li><a href="https://github.com/spring-projects/spring-batch/pull/5050" target="_blank">#5050</a>, <a href="https://github.com/spring-projects/spring-batch/pull/5052" target="_blank">#5052</a> - <code>JobParameter</code>, <code>JobOperatorTestUtils</code> 생성자의 null 체크 및 에러 메시지 오타 수정</li>
        </ul>
      </div>
    </div>
  </div>

  </div>
