---
layout: default
title: "JUnit5, AssertJ 활용방법 및 Spring boot 테스트 코드 작성법"
parent: Server
date: 2025-01-24
---

# 서론

---
- 처음에 테스트 코드 작성한 이유는 취업을 위해서 시작을 했습니다. 하지만 시간이 지나면서 테스트 코드를 안쓰면 더 어색하고, 개인적으로 느끼고 학습한 테스트 코드의 장점과 단위 테스트를 진행을 해야되는 이유를 팀 또는 다른 사람들에게 공유하기 위해서 `테스트코드` 작성하였습니다.

# 본론

---

## 1. 테스트를 꼭 해야하나?

- 테스트 코드를 작성해야 되는 이유를 찾아보면 다음과 같이 나온다.

```text
1. 개발 과정 중 예상치 못한 문제를 미리 발견할 수 있는데, 에러를 클라이언트보다 빨리 발견할 수 있습니다.

2. 작성한 코드가 의도한 대로 작동하는지 검증할 수 있습니다.

3. 코드 수정이 필요한 상황에서 유연하고 안정적인 대응할 할 수 있게 해줍니다. 즉, 테스트 코드는 코드 변경에 대한 사이드 이펙트를 줄이는 예방책이 됩니다. 또한 코드 변경 시, 변경 부분으로 인한 영향도를 쉽게 파악할 수 있습니다.

3. 리팩토링 시 기능 구현이 동일하게 되었다는 판단을 내릴 수 있습니다.

4. 문서로서의 역할이 가능합니다. 
```

- 물론 나도 이 장점에 대해서 공감을 합니다. 하지만 개인적으로 생각하기에 테스트를 작성해야 되는 이유는 점진적으로 커지는 서비스에서 `내 기능의 신뢰성을 최소한으로 검증`이라고 생각한다. 테스트 코드가 없다면 기능이 커지고 요구사항이 변경되면서 모든 기능의 신뢰성을 오직 내 머리 또는 수기로 작성된 문서를 통해서 해야된다. 테스트 코드를 작성하면 최소한의 나의 기능의 신뢰성을 확보할 수 있고 `복잡해지고 커져가는 서비스를 점진적으로 더 고도화를 시킬 수 있다고 생각합니다.`



### 1-1. 좋은 테스트란 무엇인가?
- 좋은 테스트는 `리팩토링 내성` , `회귀방지` , `빠른 피드백`, `유지보수성`이 일정 수준 이상으로 유지하고 있는 테스트가 좋다고 생각한다. 하지만 실제 테스트 코드를 작성하면 어떤 방식으로 작성을 해야되는지 고민이 된다.

- 개인적으로 4가지 특성에서 가장 중요한 특징은 `리팩토링 내성`이라고 생각한다. 왜냐하면 리팩토링 내성이 부족하다면 코드를 조금 변경을 하면 테스트 코드의 많은 수정이 생기게 된다. 이것은 지속적으로 테스트를 작성을 유지하며 발전하기에 힘들게 한다.

- 예를 들어서 `Spring Context`를 로딩하지 않고 `Mock`을 통해서 테스트를 하게 된다면 당연히 `빠른 피드백`을 얻을 수 있다. 하지만 이 경우에 `Mocking 인테페이스 변경`시 많은 코드를 수정을 하게 되어야 한다. 즉. `리팩토링 내성`이 부족하다를 의미한다.


## 2. 테스트의 종류

### 2-1. 테스트 종류 설명

- 테스트에는`단위 테스트`, `통합 테스트`, `기능 테스트`, `E2E 테스트`, `성능 테스트` 등 다양한 종류가 있다. 이번에 살펴보는 내용은 `단위 테스트`를 중점적으로 작성하려고 한다. 일반적으로 Spring에서는 테스트를 하기 위해서 `JUnit`, `Mockito`테스트가 있다. 

- 여기서 `JUnit`, `Mockito`에 대해서 간단하게 설명하면 `JUnit`은 실제 DB와 테스트를 통하여 할 수 있다. 실제로 데이터를 테스트할 수 있기 때문에 높은 신뢰성을 가질 수 있지만 속도적인 측면에서는 비교적 느리다. `Mockito`는 자바를 사용하는 소프트웨어의 단위 테스트를 위한 모의 객체(Mock Objects) 프레임워크이다. 이를 사용하면 테스트를 더욱 격리시켜 특정 기능을 독립적으로 테스트할 수 있습니다. 가짜 객체를 사용함에 따라서 빠르게 테스트를 진행을 할 수 있지만 높은 신뢰성을 주기에 부족하다.


### 2-2. 디트로이트 학파 (Classicist) vs 런던 학파 (Mockist)

> SUT : 각 테스트의 테스트 대상이 되는 객체 ( ex : Car.Class) 
MUT : 각 테스트의 테스트 대상이 되는 메서드  ( ex : Car.Class -> move()) 



1. 디트로이트 학파 (고전파) 
   - `단일 기능 (단일 클래스 또는 단일 클래스와 협력 클래스)`하나의 동작에 여러 의존성이 포함된다면, 그 의존성을 만들어 주어서라도 테스트를 진행하는 것이다.물론 Database와 같은 공유 의존성만큼은 ‘테스트 더블’ 을 적용할 수 있다.

2. 런던 학파 (런던파) : 단일 클래스
   - 철저하게 하나의 클래스 단위로 격리하여 단위 테스트를 진행하는 것이다.
`SUT에 협력 객체(의존성)가 존재한다면, 불변 객체(Enum, 상수 등)를 제외한 모든 협력 객체는 ‘테스트 더블’을 적용하여 SUT를 철저히 격리`시킨다.두 학파의 가장 큰 차이점은 ‘단위(입자성)의 정의를 어떻게 내리는지’ 에 대한 부분이다. 즉, 런던파는 한 번에 한 클래스만 테스트 되어야하고, 고전파는 SUT와 연결된 협력 객체까지 같이 테스트를 진행하게 된다.



> 각 학파의 장단점 및 선호하는 학파에 대한 내용은 다음 게시글에 작성을 하겠다.



## 3. JUnit5

### 3-1. JUnit5이란 무엇인가?
- JUnit5은 Java 기반 코드를 테스트를 할 수 있도록 하는 라이브러리이며 JUnit Platform + JUnit Jupiter + JUnit Vintage으로 구성되어있다.

### 3-2. Intellij Live template
- 테스트를 처음 접하는 사람들은 `실무에서 업무를 하는데 시간이 없는데 업무를 하기에도 바쁜데 테스트 코드까지 언제 작성하냐` 이런 이야기를 많이 한다. 코드를 치는 시간도 일종의 리소스인데 이것을 Intellij에서는 쉽게 할 수 있게 도와준다.

- 일단 테스트를 하고 싶은 클래스에서 `ctrl + command + t`를 입력하면 `create new test`를 선택하여 테스트를 바로 만들 수 있다.

- 이후 `setting -> live template -> custom 폴더를 하나 만들고 원하는 template`을 입력한다.

![](https://velog.velcdn.com/images/geon_km/post/1596d187-fe22-48aa-b497-5dfdf3271a23/image.png)

```java
@Test
public void $METHOD_NAME$() throws Exception{
    // given
    $END$
    // when

    // then
}
```

### 3-3. ***@Test***
- 메서드가 테스트 메서드임을 나타낸다.  JUnit 4의 @Test주석과 달리 이 주석은 어떠한 속성도 선언하지 않습니다.

```java
@Test
public void test() {

}
```

### 3-4. ***@DisplayName***
- 테스트가 많아지면 테스트의 변수명을 신경을 써야한다. 왜냐하면 테스트의 내용을 명확하게 읽을 수 있게 하기 위해서 이다. ( 테스트는 명세서의 역활도 하기 때문에 ) @DisplayName을 사용하면 테스트 메서드 실행 후 표시될 테스트 명을 지정할 수 있다. 이것을 한글로 하면 명확하게 테스트를 진행할 수 있다.

```java
    @Test
    @DisplayName("todo 생성")
    public void createTodo() throws Exception{
        // given
        Todo todo = Todo.builder()
                .title("title")
                .content("content")
                .build();
        // when
        Todo result = todoService.createTodo(todo);
        // then
        assertThat(result.getTitle()).isEqualTo(todo.getTitle());

    }
```

![](https://velog.velcdn.com/images/geon_km/post/ad6f770c-b34c-4e06-87bf-9be769ecc639/image.png)


### 3-5. ***@Nested***
- @Nested는 주석이 달린 클래스가 비정적 중첩 테스트 클래스를 나타낸다. 자바 8~15까지는 클래스별 테스트 인스턴스 수명 주기를 사용 하지 않는 한 테스트 클래스에서 @BeforeAll메서드 @AfterAll를 직접 사용할 수 없습니다 . Java 16부터는 테스트 인스턴스 수명 주기 모드를 사용하여 테스트 클래스 에서 와 같이 메서드 를 선언할 수 있습니다.
![](https://velog.velcdn.com/images/geon_km/post/fc60f067-00d0-4f50-ba3a-433726f8f911/image.png)

### 3-6. @DisplayNameGeneration

- @DisplayName 처럼 별도의 이름을 주는 것이 아닌 코딩한 클래스, 메소드 이름을 이용해 변형시키는 어노테이션입니다.

| 파라미터명 | 타입                                 | 설명                                                      |
|------------|--------------------------------------|-----------------------------------------------------------|
| value      | Class<? extends DisplayNameGenerator> | 정의된 DisplayNameGenerator 중 하나를 사용합니다.          |

내부 클래스로 정의된 `DisplayNameGenerator`에서 사용 가능한 방법은 다음과 같습니다:

| 클래스명          | 설명                                           |
|------------------|------------------------------------------------|
| Standard         | 기존 클래스 및 메소드 명을 사용합니다. (기본값) |
| Simple           | 괄호를 제외시킵니다.                             |
| ReplaceUnderscores | _(underscore)를 공백으로 바꿉니다.                |
| IndicativeSentences | 클래스명 + 구분자(", ") + 메소드명으로 바꿉니다. |



```java
class MemberTest {

	// 클래스 + 구분자 + 메서드
    @Nested
    @DisplayNameGeneration(DisplayNameGenerator.IndicativeSentences.class)
    class IndicativeSentences {

        @Test
        void test_display_name_generation() {
        }
    }
	
    // 뒤에 ()와 _ 가 삭제되게 나온다.
    @Nested
    @DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
    class ReplaceUnderscores {

        @Test
        void test_name_generation() {
        }
    }

	// 뒤에 ()가 삭제되게 나오게 된다.
    @Nested
    @DisplayNameGeneration(DisplayNameGenerator.Simple.class)
    class Simple {

        @Test
        void test_name_generation() {
        }
    }

	// 기본 그대로 출력된다.
    @Nested
    @DisplayNameGeneration(DisplayNameGenerator.Standard.class)
    class Standard {

        @Test
        void test_name_generation() {
        }
    }

}
```
![](https://velog.velcdn.com/images/geon_km/post/30abc8ca-1b43-4979-83a8-6cda76cb22e9/image.png)


### 3-7 ***@BeforeAll, @BeforeEach, @AfterAll, @AfterEach***

- 각 이름에서 알 수 있듯이 메서드 실행 이전, 이후에 각각 또는 전체를 실행을 시켜주는 어노테이션이다.

```java
   @BeforeEach
    void beforeEach() {
        System.out.println("@BeforeEach");
    }

    @BeforeAll
    static void beforeAll() {
        System.out.println("@BeforeAll");
    }

	@AfterAll
    static void afterAll() {
        System.out.println("@AfterAll");
    }

	@AfterEach
    void afterEach() {
        System.out.println("@AfterEach");
    }

```

- `All`은 적용된 메서드는 테스트 클래스의 테스트가 실행되기 전에 단 한번만 실행된다. 여러 개의 테스트 중에서 공통적으로 처리되어야 하는 로직을 all로 분리시킬 수 있지만 테스트에 의해서 값이 변경될 수 있으니 활용에 주의를 해야된다.
- `Each`은 테스트 클래스에서 각각의 모든 테스트 메서드가 실행되기 이전, 이후에 실행되는 메서드이다. 각각의 테스트에 적용되기 때문에 앞에 테스트에 영향을 받지 않는다.

> @All @Each 차이점
- @All을 사용할 경우 static method이기 때문에 `AOP로 구현되는 @Transactional`이 적용되지 않는다.
- @Each의 경우에는 하나의 트랜잭션으로 묶이기 때문에 롤백을 할 수 있다. 하지만 각각의 테스트에 반복되기 때문에 속도를 저하시킬 수 있다.






## 4. 반복 테스트

### 4-1. @RepeatedTest


| 파라미터명 | 타입   | 설명                                                                                           |
|------------|--------|------------------------------------------------------------------------------------------------|
| value      | int    | 반복 횟수 (반드시 0보다 커야함) (필수)                                                         |
| name       | String | 반복할 때 나타나는 테스트명<br>기본값 : "repetition " + 현재 반복 횟수 + " of " + 총 반복 횟수 |

@ReapeatedTest를 사용하면 RepetitionInfo 타입의 인자를 받을 수 있습니다. 앞에서 설명했어야 했는데 추가로 말하자면 JUnit 테스트는 기본적으로 TestInfo 타입의 인자도 받을 수 있습니다.

TestInfo

| 메소드명         | 타입               | 설명                                     |
|------------------|--------------------|-----------------------------------------|
| getDisplayName() | String             | @DisplayName 값이랑 동일                |
| getTags()        | Set<String>        | @Tag 배열 값                            |
| getTestClass()   | Optional<Class<?>> | 패키지 + 테스트 클래스명                |
| getTestMethod()  | Optional<Method>   | 패키지명 + 테스트 클래스명 + 테스트 메소드 |

RepetitionInfo

| 메소드명 / 변수명      | 타입   | 설명                                                                                 |
|------------------------|--------|------------------------------------------------------------------------------------|
| getCurrentRepetition() | int    | 현재 반복 횟수                                                                     |
| getTotalRepetitions()  | int    | 총 반복 횟수                                                                       |
| DISPLAY_NAME_PLACEHOLDER | String | @DisplayName 값                                                                    |
| SHORT_DISPLAY_NAME     | String | 반복할 때 나타나는 테스트명<br>기본값 : "repetition " + 현재 반복 횟수 + " of " + 총 반복 횟수 |
| LONG_DISPLAY_NAME      | String | DISPLAY_NAME_PLACEHOLDER + " :: " + SHORT_DISPLAY_NAME                             |
| TOTAL_REPETITIONS_PLACEHOLDER | String | 현재 반복 횟수                                                                     |
| CURRENT_REPETITION_PLACEHOLDER | String | 총 반복 횟수                                                                       |


```java

    @RepeatedTest(value = 3, name = "{displayName} - {currentRepetition}/{totalRepetitions}")
    @DisplayName("Repeating Test")
    void repeatedTest(TestInfo testInfo, RepetitionInfo repetitionInfo) {
        System.out.println("Running repetition " + repetitionInfo.getCurrentRepetition()
                + " of " + repetitionInfo.getTotalRepetitions());
        assertEquals(2, Math.addExact(1, 1), "1 + 1 should equal 2");
    }

    @RepeatedTest(5)
    void repeatedTestWithDefaults(TestInfo testInfo) {
        System.out.println("Running " + testInfo.getTestMethod().get().getName());
        assertEquals(2, Math.addExact(1, 1), "1 + 1 should equal 2");
    }

    @RepeatedTest(value = 5, name = "Custom name {currentRepetition}/{totalRepetitions}")
    void repeatedTestWithCustomName(TestInfo testInfo) {
        System.out.println("Running " + testInfo.getTestMethod().get().getName());
        assertEquals(2, Math.addExact(1, 1), "1 + 1 should equal 2");
    }

```



### 4-2. @ParameterizedTest
- 인자를 가독성이 정의하여 테스트 할 수 있다. @ParameterizedTest와 @ValueSource를 사용하여 다양한 파라미터 값으로 테스트를 반복적으로 실행할 수 있다.

@ParameterizedTest 어노테이션은 다음과 같은 파라미터를 가집니다:

| 파라미터명 | 타입 | 설명 |
|------------|------|------|
| name | String | @DisplayName 설정 |
| DISPLAY_NAME_PLACEHOLDER | String | @DisplayName과 동일 |
| INDEX_PLACEHOLDER | String | 현재 실행 인덱스 |
| ARGUMENTS_PLACEHOLDER | String | 현재 실행된 파라미터 값 |
| ARGUMENTS_WITH_NAMES_PLACEHOLDER | String | 현재 실행된 파라미터명 + "=" + 값 |
| DEFAULT_DISPLAY_NAME | String | 기본값 "[" + INDEX_PLACEHOLDER + "] " + ARGUMENTS_WITH_NAMES_PLACEHOLDER |

@ParameterizedTest는 단독으로 사용되진 않고 어떤 파라미터를 사용하는지에 관한 어노테이션을 추가로 선언해줘야합니다.

추가로 선언하지 않았을 경우 아래와 같은 에러가 발생합니다:

```
org.junit.platform.commons.PreconditionViolationException: Configuration error: You must configure at least one set of arguments for this @ParameterizedTest
```

@ValueSource 어노테이션은 다양한 타입의 파라미터를 배열로 받아서 사용할 수 있게 해줍니다. 지원되는 타입은 다음과 같습니다:

- short[], byte[], int[], long[]
- float[], double[]
- char[], boolean[]
- String[], Class<?>[]

각 타입명의 소문자에 "s"를 붙혀주면 파라미터명이 됩니다. (예: ints, strings)

파라미터 인자는 1개만 사용 가능하며, 2개 이상 넣을 시 에러가 발생합니다.

예시 코드:

```java
package com.effortguy.junit5;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class ParameterizedTestAnnotation {

    @ParameterizedTest
    @ValueSource(ints = { 1, 2, 3 })
    void testWithValueSource(int intArg) {
        assertTrue(intArg > 0 && intArg < 4);
    }
    
    // @ValueSource 파라미터로 여러개 값을 넣을 수 없음
    // @ParameterizedTest
    // @ValueSource(ints = { 1, 2, 3 }, strings = {"a", "b", "c"})
    // void testWithValueSource(int intArg, string stringArg) {
    // }
}
```

위의 예시 코드에서는 @ParameterizedTest와 @ValueSource를 사용하여 int 타입의 파라미터 값 1, 2, 3으로 테스트를 반복적으로 실행합니다.

@ValueSource에 여러 개의 파라미터를 넣으려고 시도하면 컴파일 에러가 발생합니다.
  
  
```java
@ParameterizedTest
@ValueSource(ints = {1, 3, 5, -3, 15, Integer.MAX_VALUE}) // six numbers
void isOdd_ShouldReturnTrueForOddNumbers(int number) {
    assertTrue(Numbers.isOdd(number));
}

```

### 4-3. @Dynamic Test

- 여러 테스트들이 하나의 공유 변수를 사용하면 테스트간에 강결합이 발생하고 테스트의 순서가 생기며 독립성이 보장하지 않는다는 문제가 있어서 좋은 방식이 아니다. 

- `@Dynamic Test`은 어느 환경에서 시나리오에 따라서 변화화는 것을 테스트를 할 수 있다.

- 작성하는 방법
  1. @TestFactory 어노테이션 사용
   `@TestFactory` 메소드는 테스트 케이스를 생산하는 팩토리이다. private, static은 하면 안된다.

  2. 컬렉션 반환: @TestFactory 메서드는 Stream, Collection, Iterable 또는 Iterator 를 return 해야 한다. 그렇지 않으면, JUnitException을 발생시킨다.

  3. 첫번째 인자로 테스트 이름 작성
  dynamicTest는 테스트 이름과, 실행 함수 두 요소로 이루어져있다. 그 만큼 테스트 이름을 잘 작성해주는 것이 가독성을 높이는 측면에서도 중요하다.

```java
	@DisplayName("재고 차감 시나리오")
    @TestFactory
    Collection<DynamicTest> stockDeductionDynamicTest() {
        // given
        Stock stock = Stock.create("001", 1);

        return List.of(
            DynamicTest.dynamicTest("재고를 주어진 개수만큼 차감할 수 있다.", () -> {
                // given
                int quantity = 1;

                // when
                stock.deductQuantity(quantity);

                // then
                assertThat(stock.getQuantity()).isZero();
            }),
            DynamicTest.dynamicTest("재고보다 많은 수의 수량으로 차감 시도하는 경우 예외가 발생한다.", () -> {
                // given
                int quantity = 1;

                // when // then
                assertThatThrownBy(() -> stock.deductQuantity(quantity))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("차감할 재고 수량이 없습니다.");
            })
        );
    }
```

## 4. AssertJ

- AssertJ의 assert기능 관련 메서드를 활용하면 메서드 체이닝의 형태로 테스트 코드를 작성하여 가독성에 도움을 주기 때문에 JUnit5의 Assertions 메서드 보다는 AssertJ메서드를 사용하자.

### 일반적인 테스트 코드 흐름 

- AAA 패턴 
  - 보통 테스트를 작성할 때는 given-when-then의 구조로 작성한다.

given은 테스트 데이터등을 세팅한다.

when은 테스트 하려는 동작을 수행한다.

then에서는 given-when절을 통해 나온 결과가 원하는 결과와 부합하는 지 Assertion을 통해 검증한다.

AssertJ는 then에서 결과검증시 활용된다.


### AssertJ 사용법

- AssertJ는 다양한 방법이 있다. 이번에는 내가 자주 사용하는 기능만 소개하고 더욱 깊이있는 학습을 원하면 https://assertj.github.io/doc/ 이것에서 확인할 수 있다.


AssertJ의 기본 문법 구조는 다음과 같습니다.

```java
assertThat(검증하려는 대상).검증메서드(원하는 결과);
```

예를 들어, 실제 값(actual)과 예상 값(expected)이 같은지 검증하려면 다음과 같이 작성할 수 있습니다.

```java
assertThat(actual).isEqualTo(expected);
```

문자열 검증의 경우, 다음과 같이 다양한 메서드를 활용할 수 있습니다.

```java
@Test 
void simpleStringAssertions() {
    String book = "The Lord of the Rings";
    assertThat(book).isNotNull()
                    .startsWith("The")
                    .contains("Lord")
                    .endsWith("Rings");
}
```

테스트가 실패할 경우, 좀 더 명확한 실패 메시지를 지정하고 싶다면 `as()` 메서드를 사용할 수 있습니다.

```java
@Test
void testWithFailureMessage() {
    String name = "John";
    assertThat(name).as("이름을 확인해주세요. 현재 값: %s", name)
                    .isEqualTo("Jane");
}
```

컬렉션이나 문자열에 특정 값이 존재하는지 검증하려면 `contains()`, `containsOnly()`, `containsExactly()` 메서드를 사용할 수 있습니다.

```java
@Test
void collectionContainsTest() {
    List<String> fruits = Arrays.asList("apple", "banana", "orange");
 
    assertThat(fruits).contains("apple", "banana");
    assertThat(fruits).containsOnly("orange", "banana", "apple");
    assertThat(fruits).containsExactly("apple", "banana", "orange");
}
```

객체의 특정 필드를 추출하여 검증하려면 `extracting()` 메서드를 사용할 수 있습니다.

```java
@Test
void extractingFields() {
    Person person1 = new Person("Alice", 25);
    Person person2 = new Person("Bob", 30);
    List<Person> people = Arrays.asList(person1, person2);
 
    assertThat(people).extracting("name")
                      .contains("Alice", "Bob");
 
    assertThat(people).extracting("name", "age")
                      .contains(tuple("Alice", 25),
                                tuple("Bob", 30));
}
```

Soft Assertion을 사용하면 하나의 테스트 메서드 내에서 여러 개의 검증을 수행하고, 모든 검증이 끝난 후에 결과를 한 번에 확인할 수 있습니다.

```java
@Test
void softAssertionExample() {
    SoftAssertions softly = new SoftAssertions();
    
    softly.assertThat("Gandalf").as("Character Name").isEqualTo("Gandalf");
    softly.assertThat(100).as("Power Level").isGreaterThan(90);
    softly.assertThat("Mordor").isEqualTo("Mordor");
    
    softly.assertAll();
}
```

예외 검증은 `assertThatThrownBy()` 메서드를 사용하여 수행할 수 있습니다.

```java
@Test
void exceptionTest() {
    assertThatThrownBy(() -> {
        throw new IllegalArgumentException("Invalid argument!");
    }).isInstanceOf(IllegalArgumentException.class)
      .hasMessage("Invalid argument!")
      .hasMessageContaining("Invalid");
}
```

객체 비교 시에는 `usingRecursiveComparison()` 메서드를 사용하여 필드를 재귀적으로 비교할 수 있습니다. 이때, `ignoringFields()`를 사용하여 비교에서 제외할 필드를 지정할 수 있습니다.

```java
@Test
void objectComparisonTest() {
    Person person1 = new Person("Alice", 25);
    Person person2 = new Person("Alice", 25);
    
    assertThat(person1).usingRecursiveComparison()
                       .ignoringFields("id")
                       .isEqualTo(person2);
}
```

이렇게 AssertJ를 활용하면 단위 테스트를 보다 쉽고 명확하게 작성할 수 있습니다. 다양한 메서드를 조합하여 필요한 검증을 수행할 수 있으며, 실패 메시지도 커스터마이징할 수 있어 테스트 결과를 이해하기 쉽습니다.


# 참고

---

https://wiki.mhson.world/test/junit/junit

https://junit.org/junit5/docs/current/user-guide/

https://tecoble.techcourse.co.kr/post/2020-07-31-dynamic-test/
