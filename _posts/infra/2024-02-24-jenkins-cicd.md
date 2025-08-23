---
title: "Jenkins + SVN + CodeDeploy를 이용한 Pipeline Blue-Green 무중단 배포"
date: 2024-02-24 10:00:00 +0900
categories: [DevOps, CI/CD]
tags: [Jenkins, CI/CD, CodeDeploy, Blue-Green, 무중단배포, SVN, Pipeline]
author: mugeon
---

# 서론
---

- 최근 업무에서 무중단 배포를 구축하면서 학습한 내용을 공유하기 위해 글을 작성을 하였습니다. 기존에 CI/CD를 구축하지 않고 war를 fileZira 또는 SCP를 통해서 war파일을 `target`에 전달하여 스크립트로 실행하는 환경에서 무중단 배포로 바꾸는 이유는 기존에 배포를 하기 위해서는 전 직원의 업무를 10분 정도 못하는 문제와 배포를 하면서 작업의 단절되어 데이터 정합성이 맞지 않는 이슈가 있었습니다.

- 배포를 진행하면서 CI툴인 Git Action, Jenkins, Travis등 다양한 툴이 있습니다. 이 부분에 대해서는 현재 회사의 프로젝트에 어떤 툴이 적합한지 고민하고 적용할 생각을 가지고 있습니다. Jenkins와 Github Action에 대한 경험이 있기 때문에 이번에는 배포 스크립트, Nginx에 대해서만 설명하겠습니다.



# 본론
---

## 1.[배포 전략](https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3)


> 무중단 배포란 말 그대로 서비스가 중단되지 않는 상태로, 새로운 버전을 사용자들에게 배포하는 것을 의미합니다. 무중단 배포를 사용하기 위해서는 최소 2대 이상의 서버가 확보해야합니다.

<br/>

### 1-1.Big Bang 방색

- 빅뱅 배포의 방식은 말 그대로 애플리케이션 전체 또는 상당한 부분을 한번에 업데이트를 의미를 합니다. 이 전략은 과거에 많이 사용했던 방식이다. 이 방식을 선택하기 위해서는 비즈니스 출시 이전에 광범위 개발 및 테스트가 전재가 되어야한다.

- 빅뱅 방식은 일반적으로 하나의 패키지로 개발 및 배포하며 한번 배포를 하기에 많은 시간 및 비용이 발생합니다. 이후 롤백이 불가능하거나 힘들기 때문에 실패 가능성을 최소화를 가정하며 많은 노력이 필요합니다.


<br/>


### 1-2.롤링 방식 ( Rolling )

![](https://blog.kakaocdn.net/dn/wYSvc/btrjmWL1rEM/iWnT8cK13Kutm6a7qrubVk/img.gif)




> 롤링 배포는 일반적으로 `점차` 이전 버전을 대체한다고 생각하면 된다. 실제 배포는 일정 기간에 걸쳐서 사용자에게 영향을 주지 않기 위해 새 버전과 이전 버전을 공존하게 하며 점진적으로 교체를 합니다.

**방식 1**
- 주로 AWS와 같이 서버 개수를 유연하게 조절할 수 있는 환경에서는 인스턴스를 하나 추가하고, 새로운 버전을 실행한다. 로드 밸런서에 이 인스턴스를 연결하고, 기존 구버전 어플리케이션이 실행되는 인스턴스를 하나 줄인다.


**방식 2**
- 기존의 버전 V1이 실행되고 있는 서버에 로드밸런서를 하나 때고 트래픽을 차단한다. 이 상태에서 새로운 버전으로 업데이트를 한다. 그리고 다시 로드 밸런서를 연결한다. 이를 반복하여 서서히 모든 인스턴스에 점진적으로 업데이트를 한다.

**장점**
- 롤링 배포 방식은 AWS elastic beanstalk 또는 k8s와 같은 오케스트레이션 도구에서 지원하여 간편하게 처리할 수 있으며 많은 서버 자원을 확보하지 않아도 무중단 배포가 가능하다.

- 점진적으로 새로운 버전을 출시하기 때문에 배포의 안전성이 뛰어나다.

**단점**
- 새 버전을 배포할 때 인스턴스의 수가 변경하기 때문에 특정 인스턴스에 트래픽이 몰릴 수 있다. 

- 구, 신버전의 호환성 문제가 발생할 수 있기 때문에 충분한 QA가 필요하다.

<br/>

### 1-3.블루 그린 ( Blue Green )

![](https://blog.kakaocdn.net/dn/XRBsk/btrjkiiLNDT/OO4IpUkXGRnSaOkp9t2aC1/img.gif)

- Blue Green 방식에서 Blue는 현재 운영중인 서비스 환경을 의미하고, 새롭게 배포할 환경은 Green이라고 부른다. 운영중인 구버전과 동일하게 신버전의 인스턴스를 구성하고 로드밸런서를 통해 모든 트래픽을 한번에 신버전으로 변환하는 방식을 의미를 한다.

**장점**
- 구버전의 인스턴스가 남아있어 롤백에 수월하다.
- 운영환경에서 영향을 주지 않고 새 버전으로 변경이 가능하다. ( nginx를 사용한다면 restart를 할때 1초간 영향)

**단점**
- 시스템 자원이 2배로 필요하다.



<br/>

### 1-4.카나리 ( Canary )

![](https://blog.kakaocdn.net/dn/co109I/btrjk20toUP/bzAkDoisBiKJj2tqT9YUFK/img.gif)

- 카나리 배포는 점진적으로 구버전에 대한 트래픽을 신버전으로 옮기는 롤링 배포 방식과 비슷하다. 여기서 카나리 방식의 특징으로는 **새로운 버전에 대한 오류를 조기에 감지한다.** 즉. 소수의 인원을 새로운 애플리케이션에 할당하고 안전성이 검증이 되었을 때 기존의 트래픽을 새로운 버전으로 옮기는 방식이다. 이를 통해 안전성을 확보할 수 있다는 장점이 있다.  (A/B 테스트에 적합하다.)

**장점**
- 시스템에 대한 문제를 빠르게 감지할 수 있다.
- A/B 테스트로 활용이 가능하다.

**단점**
- 네트워크 트래픽 제어를 해야한다.
- 롤링 배포와 마찬가지로 신버전, 구버전의 호환성 문제가 발생할 수 있다.

<br/>


### 전략 선택
- Blue, Green 무중단 배포를 선택을 하였습니다. 일단 어드민 시스템을 운영하기 때문에 안전성이 중요합니다. 그렇게 때문에 카나리 배포도 고려를 하였지만 Blue, Green 배포를 nginx로 사용다면 최소한의 리소스에서 저희가 원하는 무중단을 사용할 수 있기 때문에 가성비가 좋다고 생각했습니다. 또한 카나리 배포를 하였을 때 특정 사용자에 대한 부분과 어느 상황에서 안전성이 검증이 되었는가를 판단하기가 어렵다고 판단하였습니다.

![](https://velog.velcdn.com/images/geon_km/post/b631adad-e2f8-42d0-9028-e1813c43b554/image.png)


- 최종적으로는 온프로미스 환경에서 Nginx로 무중단 배포를 하겠습니다. 처음에는 사용자가 접속하면 Nginx가 8081포트로 사용자의 요청을 전달합니다. ( 이때  8082는 연결이 되지 않습니다. ) 새로운 배포가 필요하다면 연결이 되지 않은 8082포트 WAS에 배포하고 배포가 끝나면 구동 상태를 `Spring Boot Actuator`를 이용하여 확인하고 8081 -> 8082로 사용자 트래픽을 받습니다. 위에 방식과 같이 1번 더 반복하면 8081, 8082 포트의 WAS는 모두 새로운 버전으로 업데이트가 됩니다. 

- 이후 사용자의 트래픽을 분산시키기 위해 Nginx로 UpStream을 처리하는 방식으로 마무리를 하겠습니다.



## 2. Nginx란 무엇인가
![](https://velog.velcdn.com/images/geon_km/post/561cad4a-cb86-43cd-8cc9-fa6d8ad626a7/image.png)

- 엔진엑스는 `동시 접속 처리에 특화`된 `웹 서버`입니다. 아파치보다 동작이 단순하고 전달자 역활을 하기 때문에 동시 접속 처리에 특화가 되었습니다.

- 원래 엔진엑스는 아파치 앞단에서 커넥션을 줄이기 위해 만들어졌다. 이때 엔진엑스가 커넥션을 줄이는 당식으로는 정적 파일에 대한 이미지를 직접 처리할 수 있고 동적인 처리는 아파치에게 보냄으로서 커넥션을 줄일 수 있습니다. nginx에는 keep-alive설정으로 여전히 연결되어 있지만 apache에 보낼 때 별도의 요청을 보내기 때문에 커넥션을 유지할 필요가 없었습니다.


### 2-1. 엔진엑스 역활
**1. 정적 파일을 처리하는 HTTP 서버로서의 역할** 
- 웹서버의 역할은 HTML, CSS, Javascript, 이미지와 같은 정보를 웹 브라우저(Chrome, Iexplore, Opera, Firefox 등)에 전송하는 역할을 한다.

**2. 리버스 프록시 역활** 
두번째 역할은 리버스 프록시(reverse proxy)인데, 한마디로 말하면 클라이언트는 가짜 서버에 요청(request)하면, 프록시 서버가 배후 서버(reverse server)로부터 데이터를 가져오는 역할을 한다. 여기서 프록시 서버가 Nginx, 리버스 서버가 응용프로그램 서버를 의미한다.

웹 응용프로그램 서버에 리버스 프록시(Nginx)를 두는 이유는 요청(request)에 대한 버퍼링이 있기 때문이다. 클라이언트가 직접 App 서버에 직접 요청하는 경우, 프로세스 1개가 응답 대기 상태가 되어야만 한다. 따라서 프록시 서버를 둠으로써 요청을 배분하는 역할을 한다.


### 2-2. L4, L7 스위치

- OSI 7 Layer를 살펴보면 각 계층마다 스위치가 있다. 이 중에서 L4, L7 스위치는 비슷한 역활을 하지만 차이점이 있다. 

- 지금 설명하고 있는 엔진엑스는 L7 스위치에 해당되는데 L4, L7 스위치에 대해 설명하고 각 역활과 차이를 설명하겠다.

### 2-3. L7 스위치 (엔진엑스)
- OSI 7Layer중 Layer7을 기준으로 로드밸런싱하는 역할을 합니다. 애플리케이션 (HTTP, HTTPS, FTP, SMTP)에서 트래픽을 분산하여 URL에 따라 부하를 분산하거나 HTTP 헤더의 쿠키값에 따라서 부하를 분산하는 다양한 전략을 기반으로 클라이언트에게 세분화하여 서버에 전달한다. ( 일반적인 로드밸런서 알고리즘은 라우트 로빈 방식을 사용한다.)

- 정확하게는 패킷의 내용을 확인하고 그 내용에 따라 로드를 특정 서버에 분배하는 기능을 한다.

- 또한 L7 로드밸런서의 경우 특정한 패턴을 지닌 바이러스를 감지해 네트워크를 보호할 수 있다. -> 이것은 Dos나 DDos와 같은 비정상적인 트래픽을 필터링 할 수 있다.

### 2-4. L4 스위치
- OSI 7 Layer에서 네트워크 계층이나 트랜스포트 계층의 정보를 바탕으로 정보를 로드를 분산시킨다. Real IP 즉. 탄력적 IP를 묶어서 로드밸런싱을 한다. 이때 L7과 같이 라우트 로빈 방식을 사용한다. 

- L4 스위치는 Fail over(장애 극복 기능)을 통하여 예비 시스템으로 자동전환되는 기능이다. 시스템 대체 작동 또는 장애 조치라고 한다. 반면 사람이 수동으로 실시하는 것을 스위치 오버라고 한다.

![](https://velog.velcdn.com/images/geon_km/post/b471c2cb-dbac-48be-8073-54fe033a7633/image.png)


### 2-5. 로드밸런서 알고리즘

| 로드 밸런싱 알고리즘        | 설명                                                                                                  |
|-------------------------|-------------------------------------------------------------------------------------------------------|
| Round Robin             | 요청을 순서대로 각 서버에 균등하게 분배하는 방식으로, 서버 커넥션 수나 응답시간에 상관없이 모든 서버를 동일하게 처리합니다. 다른 알고리즘에 비해 가장 빠릅니다. |
| IP 해시 방식            | 클라이언트의 IP 주소를 특정 서버로 매핑하여 요청을 처리하는 방식으로, 사용자의 IP를 해싱하여 로드를 분배하기 때문에 사용자가 항상 동일한 서버로 연결되는 것을 보장합니다. |
| Least Connection        | 서버에 연결되어 있는 Connection 개수만 갖고 단순비교하여 가장 적은 곳에 연결합니다.                           |
| Weighted Least Connections | 서버에 부여된 Weight 값을 기반으로 Connection 수의 개수와 같이 고려하여 할당합니다.                        |
| Fastest Response Time  | 가장 빨리 응답하는 서버에 이용자 요구를 연결하는 방법으로, 각 서버가 패킷 형태의 요구를 송수신하는데 걸리는 시간을 측정한 것입니다. |
| Adaptive                | Open 또는 Pending(계류중인) 커넥션을 적게 가지고 있는 서버로 네트웍 커넥션 방향을 지정합니다. Pending 커넥션은 Full TCP Handshake를 완성하지 않은 것으로, 이것은 초당 클라이언트 Thread의 수가 증가할 때 더욱 잘 수행됩니다. |



### 2-6. L4, L7 스위치 정리


|          | L4 로드밸런서                                        | L7 로드밸런서                                        |
|----------|---------------------------------------------------|---------------------------------------------------|
| 계층      | 네트워크 계층 (Layer 4)                            | 전송 계층 (Layer 7)                                 |
| 특징      | TCP/UDP포트 정보를 바탕으로 함                    | TCP/UDP정보는 물론 HTTP의 URI, FTP의 파일명, 쿠키 정보 등을 바탕으로 함 |
| 장점      | - 데이터 안을 들여다보지 않고 패킷 레벨에서만 로드를 분산하기 때문에 속도가 빠르고 효율적<br>- 데이터의 내용을 복호화할 필요가 없기에 안전함<br>- L7 로드밸런서보다 가격이 저렴함 | - 상위 계층에서 로드를 분산하기 때문에 훨씬 더 섬세한 라우팅이 가능함<br>- 캐싱 기능을 제공함<br>- 비정상적인 트래픽을 사전에 필터링 할 수 있어 서비스 안정성이 높음 |
| 단점      | - 패킷의 내용을 살펴볼 수 없기 때문에 섬세한 라우팅이 불가능함<br>- 사용자의 IP가 수시로 바뀌는 경우라면 연속적인 서비스를 제공하기 어려움 | - 패킷의 내용을 복호화해야 하기에 부하가 많이 걸릴수 있고, 더 높은 비용을 지불해야함<br>- 클라이언트가 로드밸런서와 인증서를 공유해야 하기 때문에 공격자가 로밸런서를 통해서 클라이언트에 데이터에 접근할 보안 상의 위험성이 존재함 | 


<br/>

## 3. 무중단 배포 만들기

----

### 3-1. EC2 생성하기

- 실행 환경은 ubuntu 22.04 버전으로 ec2 인스턴스를 2개 생성합니다.  각각의 ec2는 각 역활이 있습니다. 일단 간단한게 ec2-A와 ec2-B라고 가정을 하겠습니다. 

- ec2-A에서  docker를 이용하여 jenkins를 설치합니다. ( 만약에 ec2의 인스턴스를 프리티어로 설정한다면 메모리가 부족할 수 있기 때문에 주의를 해야합니다. )

- ec2-B는 jenkins에서 빌드를 누르면 실제로 사용하는 스프링 서버를 의미를 합니다.

### 3-2. EC2-A에 Jenkins 설치하기


### 3-2-1.메모리 스왑부터 진행을 하겠습니다.

```shell
sudo dd if=/dev/zero of=/swapfile bs=128M count=32

sudo chmod 600 /swapfile

sudo mkswap /swapfile

sudo swapon /swapfile

sudo swapon -s

sudo vi /etc/fstab
--------------------
[ vi에 하단에 추가 ] 
/swapfile swap swap defaults 0 0
----------------------
## 용량 확인
free
```

- 아래와 같이 나온다면 정상적으로 변경이 되었습니다.
![](https://velog.velcdn.com/images/geon_km/post/493607b4-96d8-4f14-bd89-793ba45e29fa/image.png)


### 3-2-2. Docker 설치

```shell 
# 오래된 버전 삭제
sudo apt-get remove docker docker-engine docker.io containerd runc

sudo apt-get update
# repository 설정
sudo apt-get -y install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker의 Official GPG Key 를 등록
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# stable repository 를 등록
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

# Docker Engine 설치
sudo apt-get -y install docker-ce docker-ce-cli containerd.io

# 설치 완료 확인, 버전 확인
docker --version

# /var/run/docker.sock 접근 권한 허용
sudo chmod 666 /var/run/docker.sock

# docker hub 로그인 id/pw 입력
docker login
```

### 3-2-3. Docker를 이용하여 Jenkins 설치하기

```shell
docker run \
  --name jenkins-docker \
  -p 8080:8080 -p 50000:50000 \
  -v /home/jenkins:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  -u root \
  -d \
  jenkins/jenkins:lts
  
```

### 3-2-4. 젠킨스 컨테이너 접속

```shell
 # jenkins 컨테이너 접속
docker exec -it [jenkins 컨테이너ID] bin/bash

# jenkins 컨테이너 log 확인
docker logs [jenkins 컨테이너ID]

apt-update
apt-get install zip
apt-get install awscli
apt-get install subversion
```
- 저는 svn을 사용하기 때문에 subversion을 사용을 하였습니다. 만약에 github을 사용한다면 git trigger를 통해서 해결할 수 있습니다.


### 3-2-5. 젠킨스 필요한 플러그인 설치

- 다음은 Jenkins 플러그인을 설치를 해야된다. 일단 간단한 플러그인은 다음과 같다.

![](https://velog.velcdn.com/images/geon_km/post/5088e8c0-79fa-44b5-bf1e-0f7795938781/image.png)
```shell
## 필요한 플러그인
AWS CodeDeploy Plugin for Jenkins / 1.23
AWS Credentials Plugin / 231.v08a_59f17d742
Pipeline: AWS Steps / 1.45
Pipeline: API
Strict Crumb Issuer Plugin / 2.1.1
AWS CodeDeploy Plugin for Jenkins
```


#### Jenkins: 403 No valid crumb was included in the request

- Jenkins를 실행하고 사용하다보면 위에 오류가 보인다. 이 문제를 해결하기 위해서는 다음과 같다.

1. **403 No valid crumb was included in the request**

> Dashboard > Jenkins관리 > Script Console 탭으로 이동하여

```python
import jenkins.model.Jenkins

def instance = Jenkins.instance
instance.setCrumbIssuer(null)

println('success') // 에러 없이 스크립트 실행여부 확인
```

- 이후 재시작

2. **Strict Crumb Issuer Plugin**

> Dashboard > Jenkins관리 > Plugins > Available plugins > Strict Crumb Issuer Plugin 설치
Dashboard > Jenkins관리 > Security 탭으로 이동하여
CSRF Protection 섹션으로 이동하여 아래처럼 설정을 전부 다 해제한다.

![](https://velog.velcdn.com/images/geon_km/post/5dda490c-0b7b-4369-9973-436321e38d99/image.png)

- 일반에서 localhost:8080으로 변경하기


### 3-2-6. Jenkins Credentials

![](https://velog.velcdn.com/images/geon_km/post/db308403-de19-4bee-af71-e317543d2d46/image.png)![](https://velog.velcdn.com/images/geon_km/post/56c9f131-5c14-48b8-bac0-2dcac57de62b/image.png)

- Jenkins 설정 > Credentials에서 `global`한 환경변수를 추가한다. 이렇게 설정하면 젠킨스 item에서 보안과 확장성을 얻을 수 있다.

### 3-2-7. Jenkins Pipeline
- item > pipeline > Configuration 클릭

![](https://velog.velcdn.com/images/geon_km/post/2cc84792-ed1b-449f-b427-f31c750c7de9/image.png)


#### Jenkins Pipeline Script

```shell
pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-northeast-2'
        S3_BUCKET = '#{s3 이름}'
        APPLICATION_NAME = '#{codeDeploy이름}'
        DEPLOYMENT_GROUP_NAME = '#{deployGroup이름}'
    }

    stages {
        stage('Checkout') {
            steps {
                dir('#{svn ip이름}') {
	                sh 'rm -rf *@tmp'
                    checkout([
                        $class: 'SubversionSCM',
                        locations: [
                            [
                                credentialsId: 'tbnws',
                                local: '.',
                                remote: '#{svn ip이름}'
                            ]
                        ],
                        workspaceUpdater: [$class: 'UpdateUpdater']
                    ])
                }
            }
            post {
                success {
                    echo 'Checkout stage succeeded'
                }
                failure {
                    echo 'Checkout stage failed'
                }
            }
        }

        stage('Update') {
            steps {
                dir('#{svn ip}') {
                    // sh 'svn upgrade'
                    sh 'svn update'
                }
            }
            post {
                success {
                    echo 'Update stage succeeded'
                }
                failure {
                    echo 'Update stage failed'
                }
            }
        }

        stage('Build') {
            steps {
                dir('/var/jenkins_home/workspace/#{spring 이름}') {
                    sh 'chmod 777 gradlew'
                    sh './gradlew build'
                }
            }
            post {
                success {
                    echo 'Build stage succeeded'
                }
                failure {
                    echo 'Build stage failed'
                }
            }
        }

        stage('Upload to S3') {
            steps {
                withAWS(region: AWS_REGION, credentials: 'TBNWS_AWS_Credentials') {
                    script {
                        def zipFileName = "springServer-1.zip"
                        dir('/var/jenkins_home/workspace/#{spring 이름}') {
                            sh "zip -r ${zipFileName} build/libs/tbnws_admin_back.jar appspec.yml script/"
                            sh "aws s3 cp ${zipFileName} s3://${S3_BUCKET}/"
                        }
                    }
                }
            }
            post {
                success {
                    echo 'Upload to S3 stage succeeded'
                }
                failure {
                    echo 'Upload to S3 stage failed'
                }
            }
        }

        stage('Deploy with CodeDeploy') {
            steps {
                withAWS(region: AWS_REGION, credentials: 'TBNWS_AWS_Credentials') {
                    script {
                        def deployCommand = "aws deploy create-deployment " +
                            "--application-name ${APPLICATION_NAME} " +
                            "--deployment-config-name CodeDeployDefault.OneAtATime " +
                            "--deployment-group-name ${DEPLOYMENT_GROUP_NAME} " +
                            "--s3-location bucket=${S3_BUCKET},bundleType=zip,key=springServer-1.zip"
                        sh deployCommand
                    }
                }
            }
            post {
                success {
                    echo 'Deploy with CodeDeploy stage succeeded'
                }
                failure {
                    echo 'Deploy with CodeDeploy stage failed'
                }
            }
        }
    }
}
```



## 3-4. CodeDeploy 설정

- 해당 과정에 대해서는 https://jojoldu.tistory.com/313 해당 사이트에서 얻을 수 있다.


## 3-3. Private Subnet Target EC2(EC2-B)에 CodeDeploy설치

```shell
sudo apt-get update

sudo apt-get install ruby

sudo apt-get install wget

# install 파일 경로는 원하는 대로 가능
cd /home/ubuntu


# Seoul region
wget https://aws-codedeploy-ap-northeast-2.s3.ap-northeast-2.amazonaws.com/latest/install

chmod +x ./install
sudo ./install auto

# codedeploy-agent 상태 확인
sudo service codedeploy-agent status

# codedeploy-agent 서비스 시작
sudo service codedeploy-agent start

```

### 3-4. 무중단 배포하기

- 젠킨스에서 Build를 하게되면 SVN에서 update를 하여 최신 버전으로 변경하고 jar파일을 Zip 형태로 압축하고 S3에 업로드 합니다. 이후 CodeDeploy에 Build를 하게 되는데 이때 

![](https://velog.velcdn.com/images/geon_km/post/472d8659-2a7a-4160-bdf7-77b5cbce9039/image.png)

### appspec.yml
```shell
version: 0.0
os: linux
files:
  - source:  /
    destination: /home/ubuntu
    overwrite: yes

permissions:
  - object: /
    pattern: "**"
    owner: ubuntu
    group: ubuntu

hooks:
  AfterInstall:
    - location: script/deploy.sh
      timeout: 180
      runas: ubuntu
  ApplicationStart:
    - location: script/switch.sh
      timeout: 180
      runas: ubuntu

```

### deploy.sh
```shell
```

### switch.sh

### validate.sh




```shell
# update
$ sudo apt get update

# nginx 설치
$ sudo apt install nginx

# 설치 확인
$ ps -ef | grep nginx
```

![](https://velog.velcdn.com/images/geon_km/post/b820cca8-5e1a-474f-9feb-b95987355421/image.png)










- nginx의 설정을 위해서 /etc/nginx/nginx.conf에서 include를 추가할 수 있고 /etc/nginx/conf.d/service-url.inc를 설정한다.

```shell
# inc는 include 파일을 의미한다.
sudo vi service-url.inc

set $service_url http://127.0.0.1:8081;
```





<br/>

## 4. Graceful Shutdown

- blue green 배포에서는 상관이 없지만 다른 배포에서 구버전 애플리케이션을 죽일 때 프로세스를 죽일 때 고민을 해야됩니다. 프로세스를 바로 죽이게 하는 것과 현재 처리하고 있는 요청을 모두 완료하고 죽이는 건 시스템에 따라서 다릅니다.

- 하지만 복구 프로세스가 복잡하다면 고민할 필요가 있습니다. 만약에 배포를 할때 시간이 긴 프로세스를 처리하고 있다면 이 부분도 고민할 필요가 있습니다.


<br/>

### 4.1 Kill -9(SIGKILL) / kill -15(SIGTERM)
- 리눅스 환경에서 PID를 죽여서 프로세스를 죽입니다. 

**SIGKILL**
- `signal + kill` 의 약자로, 프로세스를 **강제로** 죽인다.
- signal + kill 의 약자로, 프로세스를 강제로 죽인다.
```shell
$ kill -9 pid
```
<br/>

**SIGTERM**
-- `signal + terminate`의 약자로, 프로세스를 **종료하라는 신호**를 보낸다.
    - 단, 이 신호는 강제성 여부가 불투명하며 **종료 권고에 가깝다.**
```shell
$ kill -15 pid
```

<br/>

### 4.2 Spring Graceful Shutdown

- 스프링에서 kill -9 , kill -15를 적용할 수 있습니다. 이것은 사용하면 spring을 SIGKILL을 한다면 바로 종료되고 SIGTERM은 현재 프로세스가 종료되고 스프링을 종료합니다.

- 다음은 application.yml에 추가할 내용입니다.
```yaml
server:
  shutdown: graceful # default immediate

spring:
  lifecycle:
    timeout-per-shutdown-phase:10s 
```
- 만약에 프로세스가 time-out보다 느리다면 10초가 지난 이후에는 스프링을 종료시킨다.

> Spring Boot는 2.3 버전부터 Graceful Shutdown 을 지원한다.

### 4.3 예시 코드

- 다음 코드를 살펴보면 for문을 돌면서 thread.sleep을 한다. 여기서 테스트는 for문을 돌면서 log를 찍는데 이때 kill-9를 하였을 때와 kill -15를 하였을 때 graceful shutdown이 되었는지 확인하겠다.

```java
@RestController
public class ShutDownController {
    protected final Logger logger = LoggerFactory.getLogger(this.getClass().getSimpleName());

    @GetMapping("/test")
    public String test() throws InterruptedException {
        logger.info("=================start==================");
        for (int i=0; i< 30; i++){
            logger.info("test2 : {}" , i);
            Thread.sleep(1000);
        }
        logger.info("=================end==================");
        return "success";
    }

}

```


### 4.4 Spring Kill -9

- API를 호출하고 `kill -9 pid`를 하였을 때 바로 shut down이 되는 것을 확인할 수 있다.

![](https://velog.velcdn.com/images/geon_km/post/95e68ab2-ce62-4ef4-855c-5c7c9ab53f41/image.png)

### 4.5 Spring Kill -15

- API를 호출하고 `kill -15 pid`를 하였을 때 바로 graceful shutdown이 출력되고 모든 프로세스가 끝난 이후에 Spring이 종료된다. 
![](https://velog.velcdn.com/images/geon_km/post/022eec44-6f6b-4ab3-9116-ab814b4ae31d/image.png)


### 4.6 Shutdown시 데드락

- 만약에 프로세스를 종료하는데 데드락이 걸리면 프로세스가 꺼지지 못하는 경우가 발생할 수 있다. 이때는 시스템의 요구사항에 따라서 time-out을 설정을 해야된다.


```yaml
spring:
  lifecycle:
    timeout-per-shutdown-phase:10s 
```

- 이때 만약에 shutdown licecycle보다 실행 중인 프로세스의 작업이 더 길어지면 강제로 종료를 시킨다.

```yaml
Failed to shut down 1 bean with phase value 20122369 within timeout of 2000ms

Graceful shutdown with one or more requests still active
```




# 참고
---

https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3


https://sihyung92.oopy.io/server/nginx_feat_apache

https://hudi.blog/springboot-graceful-shutdown/