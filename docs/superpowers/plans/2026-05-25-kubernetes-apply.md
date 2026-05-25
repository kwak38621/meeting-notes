# Kubernetes 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meeting Notes (Spring Boot + React + MySQL)를 로컬 Docker Desktop Kubernetes에 3단계(MySQL → Backend → Frontend+Ingress)로 점진 배포한다.

**Architecture:** Namespace `meeting-notes`로 격리. MySQL은 StatefulSet+PVC로 영속화. Backend/Frontend는 Deployment+Service. Ingress(nginx)가 `/api`는 backend, `/`는 frontend로 라우팅. 이미지는 로컬 docker 데몬에서 빌드해 `IfNotPresent`로 즉시 사용 (레지스트리 미사용).

**Tech Stack:** Kubernetes (Docker Desktop), kubectl, ingress-nginx, mysql:8.0, Java 17 / Spring Boot 3.2, Node 20 / Vite / Nginx 1.27.

**Spec:** `docs/superpowers/specs/2026-05-25-kubernetes-apply-design.md`

**중요 운영 원칙:**
- 모든 `kubectl` 명령은 `-n meeting-notes` 네임스페이스 지정.
- Secret yaml은 git에 커밋하지 않는다. `.example`만 커밋.
- 각 Task 끝에 commit.
- 기존 docker-compose / bootRun / npm run dev 흐름은 손대지 않는다.

---

## Task 0: 사전 환경 점검 및 .gitignore 정비

**목적:** Docker Desktop K8s가 켜져 있고 `kubectl`이 동작하는지 확인. Secret 파일이 실수로 커밋되지 않도록 차단.

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Docker Desktop K8s 활성화 확인**

Docker Desktop → Settings → Kubernetes → "Enable Kubernetes" 체크되어 있어야 함. 없다면 체크 후 "Apply & Restart".

Run:
```bash
kubectl version --short
kubectl config current-context
```
Expected: `Client Version: v1.xx.x`, `Server Version: v1.xx.x`, context는 `docker-desktop`.

- [ ] **Step 2: 기본 동작 확인**

Run:
```bash
kubectl get nodes
kubectl get storageclass
```
Expected: 노드 1개 `Ready`, StorageClass `hostpath` (default) 또는 `standard` 존재.

- [ ] **Step 3: .gitignore에 k8s secret 패턴 추가**

`.gitignore` 끝에 다음 블록 추가:
```
# Kubernetes secrets (실제 secret.yaml은 절대 커밋하지 않는다)
k8s/**/secret.yaml
!k8s/**/secret.yaml.example
```

- [ ] **Step 4: 커밋**

```bash
git add .gitignore
git commit -m "chore(k8s): ignore secret manifests, keep .example only"
```

---

## Task 1: Namespace 생성 및 적용

**Files:**
- Create: `k8s/00-namespace.yaml`

- [ ] **Step 1: 네임스페이스 매니페스트 작성**

`k8s/00-namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: meeting-notes
  labels:
    app.kubernetes.io/part-of: meeting-notes
```

- [ ] **Step 2: 적용 및 확인**

Run:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl get ns meeting-notes
```
Expected: `meeting-notes   Active   <age>`

- [ ] **Step 3: 커밋**

```bash
git add k8s/00-namespace.yaml
git commit -m "feat(k8s): add meeting-notes namespace"
```

---

## Task 2: MySQL Secret 생성

**목적:** MySQL 자격증명을 Secret으로 관리. 실제 secret.yaml은 커밋 X, `.example` 파일만 커밋.

**Files:**
- Create: `k8s/mysql/secret.yaml.example`
- Create (로컬만): `k8s/mysql/secret.yaml` — 커밋 금지

- [ ] **Step 1: 예시 파일 작성**

`k8s/mysql/secret.yaml.example`:
```yaml
# 이 파일을 secret.yaml로 복사 후 값 채우기. secret.yaml은 .gitignore.
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
  namespace: meeting-notes
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "REPLACE_ME_ROOT"
  MYSQL_DATABASE: "meeting_notes"
  MYSQL_USER: "appuser"
  MYSQL_PASSWORD: "REPLACE_ME_USER"
```

- [ ] **Step 2: 로컬용 실제 secret.yaml 생성 (커밋 금지)**

`cp k8s/mysql/secret.yaml.example k8s/mysql/secret.yaml` 후 값을 실제 비밀번호로 교체. 예시:
- `MYSQL_ROOT_PASSWORD`: 강한 랜덤 문자열 (예: `openssl rand -base64 24`)
- `MYSQL_PASSWORD`: 강한 랜덤 문자열

- [ ] **Step 3: 적용 및 확인**

Run:
```bash
kubectl apply -f k8s/mysql/secret.yaml
kubectl -n meeting-notes get secret mysql-secret
```
Expected: `mysql-secret   Opaque   4   <age>`

- [ ] **Step 4: .gitignore 동작 확인**

Run:
```bash
git status
```
Expected: `k8s/mysql/secret.yaml.example`만 untracked로 보이고 `secret.yaml`은 보이지 않아야 함.

- [ ] **Step 5: 커밋 (`.example`만)**

```bash
git add k8s/mysql/secret.yaml.example
git commit -m "feat(k8s): add mysql secret example"
```

---

## Task 3: MySQL PVC + StatefulSet + Service

**Files:**
- Create: `k8s/mysql/pvc.yaml`
- Create: `k8s/mysql/statefulset.yaml`
- Create: `k8s/mysql/service.yaml`

- [ ] **Step 1: PVC 매니페스트 작성**

`k8s/mysql/pvc.yaml`:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
  namespace: meeting-notes
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

- [ ] **Step 2: Service 매니페스트 작성**

`k8s/mysql/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  namespace: meeting-notes
spec:
  type: ClusterIP
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
```

- [ ] **Step 3: StatefulSet 매니페스트 작성**

`k8s/mysql/statefulset.yaml`:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: meeting-notes
spec:
  serviceName: mysql-svc
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: mysql-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
              subPath: mysql
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
          readinessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 15
            periodSeconds: 5
            timeoutSeconds: 5
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-pvc
```

> `subPath: mysql`은 Windows hostpath에서 권한 이슈 회피용.

- [ ] **Step 4: 적용**

Run:
```bash
kubectl apply -f k8s/mysql/pvc.yaml
kubectl apply -f k8s/mysql/service.yaml
kubectl apply -f k8s/mysql/statefulset.yaml
```

- [ ] **Step 5: Pod Running 확인**

Run:
```bash
kubectl -n meeting-notes get pods -w
```
Expected: `mysql-0   1/1   Running` (1~2분 소요). 확인되면 Ctrl+C.

문제 발생 시:
```bash
kubectl -n meeting-notes describe pod mysql-0
kubectl -n meeting-notes logs mysql-0
```

- [ ] **Step 6: 로컬에서 DB 접속 확인 (port-forward)**

별도 터미널에서:
```bash
kubectl -n meeting-notes port-forward svc/mysql-svc 3307:3306
```

또 다른 터미널에서 (또는 DBeaver/MySQL Workbench):
```bash
mysql -h 127.0.0.1 -P 3307 -u appuser -p
# 비밀번호는 secret.yaml에 넣은 MYSQL_PASSWORD
# SHOW DATABASES; 에서 meeting_notes 존재 확인 후 \q
```
Expected: 정상 접속. port-forward 터미널은 Ctrl+C로 종료.

- [ ] **Step 7: 데이터 영속화 확인 (선택)**

Pod 강제 재시작 후에도 데이터가 살아남는지 검증:
```bash
kubectl -n meeting-notes delete pod mysql-0
kubectl -n meeting-notes get pods -w
# mysql-0이 다시 Running 될 때까지 대기 후 Ctrl+C
# 다시 port-forward + 접속해 데이터(테이블/유저) 유지되는지 확인
```

- [ ] **Step 8: 커밋**

```bash
git add k8s/mysql/pvc.yaml k8s/mysql/service.yaml k8s/mysql/statefulset.yaml
git commit -m "feat(k8s): add mysql statefulset, pvc, service"
```

---

## Task 4: Backend — Actuator 의존성 및 k8s 프로필 추가

**목적:** liveness/readiness probe에 사용할 `/actuator/health/*` 엔드포인트 활성화.

**Files:**
- Modify: `backend/build.gradle`
- Create: `backend/src/main/resources/application-k8s.yml`

- [ ] **Step 1: Actuator 의존성 추가**

`backend/build.gradle`의 `dependencies` 블록에서 `spring-boot-starter-validation` 줄 아래에 추가:
```gradle
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

최종 모습 (해당 영역):
```gradle
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

- [ ] **Step 2: k8s 프로필 application 파일 작성**

`backend/src/main/resources/application-k8s.yml`:
```yaml
# K8s 환경 전용 설정. SPRING_PROFILES_ACTIVE=k8s일 때 적용.
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

- [ ] **Step 3: 빌드해서 컴파일 OK 확인**

Run:
```bash
cd backend && ./gradlew bootJar
```
Expected: `BUILD SUCCESSFUL`. `build/libs/meeting-notes.jar` 생성.

- [ ] **Step 4: Actuator 엔드포인트가 동작하는지 로컬에서 확인 (선택)**

```bash
# docker-compose mysql 띄워둔 상태에서
SPRING_PROFILES_ACTIVE=k8s ./gradlew bootRun
# 다른 터미널:
curl http://localhost:8080/actuator/health/liveness
curl http://localhost:8080/actuator/health/readiness
```
Expected: 둘 다 `{"status":"UP"}`. 확인 후 bootRun 중지.

- [ ] **Step 5: 커밋**

```bash
git add backend/build.gradle backend/src/main/resources/application-k8s.yml
git commit -m "feat(backend): add actuator health probes for k8s profile"
```

---

## Task 5: Backend Dockerfile 작성 및 이미지 빌드

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: .dockerignore 작성**

`backend/.dockerignore`:
```
build/
.gradle/
*.iml
.idea/
```

- [ ] **Step 2: Dockerfile 작성**

`backend/Dockerfile`:
```dockerfile
# Stage 1: build
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY build.gradle settings.gradle gradle.properties* ./
COPY gradle ./gradle
COPY gradlew ./
COPY src ./src
RUN gradle bootJar --no-daemon

# Stage 2: runtime
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/meeting-notes.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

> `settings.gradle`이 없으면 첫 줄에서 누락돼도 무방하지만, 안전을 위해 일단 명시. 실제 없는 경우 빌드는 정상 진행됨.

- [ ] **Step 3: 이미지 빌드**

Run:
```bash
docker build -t meeting-notes-backend:dev ./backend
```
Expected: 마지막 줄에 `naming to docker.io/library/meeting-notes-backend:dev`. 첫 빌드는 5~10분 (gradle 의존성 다운로드).

- [ ] **Step 4: 이미지가 K8s에서 보이는지 확인**

Run:
```bash
docker images | grep meeting-notes-backend
```
Expected: `meeting-notes-backend   dev   ...`. Docker Desktop K8s는 이 이미지를 그대로 본다.

- [ ] **Step 5: 커밋**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat(backend): add multi-stage Dockerfile"
```

---

## Task 6: Backend ConfigMap + Secret

**Files:**
- Create: `k8s/backend/configmap.yaml`
- Create: `k8s/backend/secret.yaml.example`
- Create (로컬만): `k8s/backend/secret.yaml`

- [ ] **Step 1: ConfigMap 작성**

`k8s/backend/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: meeting-notes
data:
  DB_HOST: "mysql-svc"
  DB_NAME: "meeting_notes"
  CORS_ORIGIN: "http://meeting-notes.local"
  SPRING_PROFILES_ACTIVE: "k8s"
```

- [ ] **Step 2: Secret 예시 작성**

`k8s/backend/secret.yaml.example`:
```yaml
# 복사 → secret.yaml. 절대 커밋하지 않는다.
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: meeting-notes
type: Opaque
stringData:
  DB_USER: "appuser"
  DB_PASSWORD: "REPLACE_ME_SAME_AS_MYSQL_PASSWORD"
  JWT_SECRET: "REPLACE_ME_LONG_RANDOM_BASE64"
```

- [ ] **Step 3: 로컬용 실제 secret.yaml 생성 (커밋 금지)**

```bash
cp k8s/backend/secret.yaml.example k8s/backend/secret.yaml
```
- `DB_PASSWORD`: mysql-secret의 `MYSQL_PASSWORD`와 **같은 값** 사용.
- `JWT_SECRET`: `openssl rand -base64 48` 결과로 교체.

- [ ] **Step 4: 적용**

```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/backend/secret.yaml
kubectl -n meeting-notes get configmap backend-config
kubectl -n meeting-notes get secret backend-secret
```
Expected: 둘 다 존재.

- [ ] **Step 5: 커밋 (`.example` + configmap만)**

```bash
git status   # secret.yaml은 안 보여야 함
git add k8s/backend/configmap.yaml k8s/backend/secret.yaml.example
git commit -m "feat(k8s): add backend configmap and secret example"
```

---

## Task 7: Backend Deployment + Service

**Files:**
- Create: `k8s/backend/deployment.yaml`
- Create: `k8s/backend/service.yaml`

- [ ] **Step 1: Deployment 작성**

`k8s/backend/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: meeting-notes
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: meeting-notes-backend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: backend-config
            - secretRef:
                name: backend-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
```

- [ ] **Step 2: Service 작성**

`k8s/backend/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
  namespace: meeting-notes
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080
```

- [ ] **Step 3: 적용**

```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl -n meeting-notes get pods -w
```
Expected: `backend-xxx-xxx   1/1   Running` (Spring 부팅 30~60초). 확인 후 Ctrl+C.

문제 발생 시:
```bash
kubectl -n meeting-notes describe pod -l app=backend
kubectl -n meeting-notes logs -l app=backend
```

- [ ] **Step 4: API 동작 확인 (port-forward)**

```bash
kubectl -n meeting-notes port-forward svc/backend-svc 8081:8080
```
별도 터미널:
```bash
curl http://localhost:8081/actuator/health
# {"status":"UP"}
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"k8s@test.com","password":"pass1234","name":"k8s tester"}'
# 정상 응답 또는 이미 존재 에러
```
Expected: Actuator health UP. API 응답 정상.

확인 후 port-forward 종료.

- [ ] **Step 5: 커밋**

```bash
git add k8s/backend/deployment.yaml k8s/backend/service.yaml
git commit -m "feat(k8s): add backend deployment and service"
```

---

## Task 8: Frontend Dockerfile + nginx.conf

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: .dockerignore 작성**

`frontend/.dockerignore`:
```
node_modules/
dist/
.vite/
```

- [ ] **Step 2: nginx.conf 작성**

`frontend/nginx.conf`:
```nginx
# 정적 파일 + SPA fallback. /api 프록시는 Ingress가 담당하므로 여기선 안 한다.
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Dockerfile 작성**

`frontend/Dockerfile`:
```dockerfile
# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# API base URL을 Ingress 경로로 주입
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: runtime
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 4: 이미지 빌드**

```bash
docker build -t meeting-notes-frontend:dev ./frontend
```
Expected: 빌드 성공. `dist/` 생성 후 nginx 이미지에 복사됨.

- [ ] **Step 5: (선택) 로컬에서 정적 서빙 확인**

```bash
docker run --rm -p 8888:80 meeting-notes-frontend:dev
# 브라우저: http://localhost:8888 — React 앱이 렌더링되는지 (API 호출은 실패해도 OK, UI만 확인)
# 확인 후 Ctrl+C
```

- [ ] **Step 6: 커밋**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
git commit -m "feat(frontend): add Dockerfile and nginx config for k8s"
```

---

## Task 9: Frontend Deployment + Service

**Files:**
- Create: `k8s/frontend/deployment.yaml`
- Create: `k8s/frontend/service.yaml`

- [ ] **Step 1: Deployment 작성**

`k8s/frontend/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: meeting-notes
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: meeting-notes-frontend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "32Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 2
            periodSeconds: 5
```

- [ ] **Step 2: Service 작성**

`k8s/frontend/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: meeting-notes
spec:
  type: ClusterIP
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
```

- [ ] **Step 3: 적용 및 확인**

```bash
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
kubectl -n meeting-notes get pods -w
```
Expected: `frontend-xxx-xxx   1/1   Running`. 확인 후 Ctrl+C.

- [ ] **Step 4: 커밋**

```bash
git add k8s/frontend/deployment.yaml k8s/frontend/service.yaml
git commit -m "feat(k8s): add frontend deployment and service"
```

---

## Task 10: ingress-nginx 컨트롤러 설치 + hosts 파일 매핑

**목적:** Ingress 리소스를 실제로 라우팅해줄 컨트롤러를 클러스터에 설치. `meeting-notes.local` 도메인을 로컬로 매핑.

- [ ] **Step 1: ingress-nginx 컨트롤러 설치**

Run:
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```
Expected: 다수의 리소스가 `created`로 출력.

- [ ] **Step 2: 컨트롤러 Pod Running 확인**

```bash
kubectl -n ingress-nginx get pods -w
```
Expected: `ingress-nginx-controller-xxx   1/1   Running` (1~2분). 확인 후 Ctrl+C.

- [ ] **Step 3: LoadBalancer 외부 노출 확인**

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller
```
Expected: `EXTERNAL-IP`이 `localhost` 또는 비어있어도 OK (Docker Desktop은 localhost로 매핑).

- [ ] **Step 4: hosts 파일 매핑 추가**

Windows 관리자 권한 메모장으로 `C:\Windows\System32\drivers\etc\hosts` 열고 다음 줄 추가:
```
127.0.0.1 meeting-notes.local
```

확인:
```bash
ping meeting-notes.local
```
Expected: `127.0.0.1`로 응답.

- [ ] **Step 5: 이 Task는 클러스터 외부 변경이라 커밋할 파일 없음**

스킵.

---

## Task 11: Ingress 적용 및 최종 통합 검증

**Files:**
- Create: `k8s/frontend/ingress.yaml`

- [ ] **Step 1: Ingress 매니페스트 작성**

`k8s/frontend/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: meeting-notes-ingress
  namespace: meeting-notes
spec:
  ingressClassName: nginx
  rules:
    - host: meeting-notes.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-svc
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
```

> `/api`가 `/`보다 먼저 매칭되도록 paths 순서대로 작성.

- [ ] **Step 2: 적용**

```bash
kubectl apply -f k8s/frontend/ingress.yaml
kubectl -n meeting-notes get ingress
```
Expected: `meeting-notes-ingress   nginx   meeting-notes.local   localhost   80   <age>`. ADDRESS가 채워질 때까지 30초 정도 대기 가능.

- [ ] **Step 3: 라우팅 검증 — Frontend**

브라우저: `http://meeting-notes.local`
Expected: React 앱 로그인 화면 정상 표시. 새로고침 후에도 정상 (SPA fallback 동작 확인).

문제 시:
```bash
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --tail=50
```

- [ ] **Step 4: 라우팅 검증 — Backend (API)**

```bash
curl http://meeting-notes.local/api/actuator/health
```
Expected: `{"status":"UP"}` 또는 status 필드 포함 응답.

- [ ] **Step 5: End-to-End 검증 (회원가입 → 로그인 → 페이지 생성 → 새로고침)**

브라우저에서:
1. `http://meeting-notes.local` → 회원가입 (예: k8s-final@test.com)
2. 로그인
3. 새 페이지 생성 → 본문 작성 → 1.5초 후 자동저장 표시
4. 페이지 새로고침(F5) → 데이터 유지 확인
5. 페이지 트리에 추가된 항목 보이는지 확인

Expected: 모두 정상 동작.

- [ ] **Step 6: 자가복구 검증**

```bash
kubectl -n meeting-notes get pods
kubectl -n meeting-notes delete pod -l app=backend
kubectl -n meeting-notes get pods -w
```
Expected: backend Pod이 자동으로 다시 생성되어 Running. 그동안 브라우저 새로고침하면 잠시 502 후 복구.

- [ ] **Step 7: MySQL 영속화 검증**

```bash
kubectl -n meeting-notes delete pod mysql-0
kubectl -n meeting-notes get pods -w
# mysql-0 다시 Running 될 때까지 대기 (Ctrl+C)
# 브라우저에서 다시 로그인 → 이전에 만든 페이지가 그대로 있어야 함
```
Expected: 데이터 유지.

- [ ] **Step 8: 커밋**

```bash
git add k8s/frontend/ingress.yaml
git commit -m "feat(k8s): add ingress and complete e2e routing"
```

---

## Task 12: README에 K8s 사용법 섹션 추가

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README에 K8s 섹션 추가**

`README.md` 끝(라이선스 위)에 다음 섹션 삽입:

```markdown
## Kubernetes (로컬, Docker Desktop)

자세한 설계: [docs/superpowers/specs/2026-05-25-kubernetes-apply-design.md](docs/superpowers/specs/2026-05-25-kubernetes-apply-design.md)

### 사전 준비
1. Docker Desktop → Settings → Kubernetes → Enable
2. ingress-nginx 컨트롤러 설치:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
   ```
3. `C:\Windows\System32\drivers\etc\hosts`에 `127.0.0.1 meeting-notes.local` 추가
4. Secret 파일 준비:
   ```bash
   cp k8s/mysql/secret.yaml.example k8s/mysql/secret.yaml
   cp k8s/backend/secret.yaml.example k8s/backend/secret.yaml
   # 두 파일의 REPLACE_ME 값을 실제 비밀번호로 교체
   ```

### 이미지 빌드 + 배포
```bash
docker build -t meeting-notes-backend:dev ./backend
docker build -t meeting-notes-frontend:dev ./frontend

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/mysql/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
```

### 접속
브라우저 → http://meeting-notes.local

### 자주 쓰는 명령
```bash
kubectl -n meeting-notes get all
kubectl -n meeting-notes logs -f deploy/backend
kubectl -n meeting-notes rollout restart deployment/backend   # 새 이미지 반영
kubectl -n meeting-notes rollout undo deployment/backend      # 롤백
```
```

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: add k8s usage section to README"
```

---

## 최종 Definition of Done 체크

- [ ] `kubectl -n meeting-notes get all` 결과: 모든 Pod `Running`, 모든 Service의 ENDPOINTS 존재.
- [ ] `http://meeting-notes.local`에서 회원가입 → 로그인 → 페이지 생성 → 자동저장 → 새로고침 후 데이터 유지.
- [ ] backend Pod 삭제 시 자동 재생성 확인.
- [ ] mysql Pod 재시작 후에도 데이터 유지 확인.
- [ ] 기존 docker-compose / bootRun / npm run dev 흐름이 여전히 동작 (회귀 없음).
- [ ] `git status`에 `k8s/**/secret.yaml`이 보이지 않음 (커밋 누출 방지).
