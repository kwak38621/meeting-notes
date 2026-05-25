# Kubernetes 적용 설계 (Meeting Notes)

- 작성일: 2026-05-25
- 대상 프로젝트: Meeting Notes (Spring Boot + React + MySQL)
- 목적: 로컬 학습 + 추후 클라우드 이전 기반 다지기

## 1. 목표와 범위

### 목표
- 현재 docker-compose 기반 구성을 **로컬 Docker Desktop Kubernetes**로 이식.
- K8s 핵심 개념(Namespace, Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret, PVC)을 실제 워크로드로 학습.
- 로컬 검증 후 추후 클라우드(NCP NKS / GCP GKE 등)로 옮길 때 manifest를 거의 재사용 가능하도록 설계.

### 범위 (이번 작업)
- Namespace 분리, MySQL StatefulSet + PVC, Backend/Frontend Deployment + Service, Ingress 라우팅, Secret/ConfigMap.
- Spring Boot Actuator 도입 (health probe용).
- 백엔드/프론트 Dockerfile 추가, nginx.conf 추가.
- 로컬 개발 흐름(docker-compose, bootRun, npm run dev)은 **그대로 보존**.

### 범위 밖 (이번엔 안 함)
- HPA(오토스케일), HTTPS/cert-manager, Prometheus/Grafana 모니터링.
- CI/CD 파이프라인, 멀티 환경(dev/staging/prod) 분리.
- MySQL 복제/백업, 클라우드 매니지드 K8s 배포.
- 이미지 레지스트리(Docker Hub/ECR 등) 푸시 — Docker Desktop은 로컬 이미지를 그대로 사용.

## 2. 전체 구조

```
[브라우저]
    ↓ http://meeting-notes.local
[Ingress (ingress-nginx)]
    ├── /api/*  → backend-svc:8080  → backend Pod (Spring Boot)
    └── /       → frontend-svc:80   → frontend Pod (nginx + React build)
                                            ↓
                                    mysql-svc:3306 → MySQL StatefulSet + PVC
```

### 핵심 선택과 근거
- **Namespace 격리**: `meeting-notes` 전용. `default` 사용 X — 학습용이라도 격리 습관.
- **이미지 레지스트리 미사용**: Docker Desktop K8s는 로컬 docker 데몬과 이미지를 공유하므로 `docker build` 후 `imagePullPolicy: IfNotPresent`로 바로 사용 가능. 클라우드로 이전 시에만 레지스트리 도입.
- **호스트명**: `meeting-notes.local`을 Windows `hosts` 파일에 `127.0.0.1`로 매핑.
- **TLS 생략**: 로컬이므로 HTTP만. 클라우드 단계에서 cert-manager 도입.

## 3. 디렉토리 구조 (신규 추가)

```
k8s/
├── 00-namespace.yaml
├── mysql/
│   ├── secret.yaml.example     # 실제 secret.yaml은 .gitignore
│   ├── pvc.yaml
│   ├── statefulset.yaml
│   └── service.yaml
├── backend/
│   ├── configmap.yaml
│   ├── secret.yaml.example
│   ├── deployment.yaml
│   └── service.yaml
└── frontend/
    ├── deployment.yaml
    ├── service.yaml
    └── ingress.yaml

backend/Dockerfile              # 신규
frontend/Dockerfile             # 신규
frontend/nginx.conf             # 신규
```

## 4. Step 1 — MySQL on K8s

**왜 MySQL부터?** 데이터 영속화(PVC)와 stateful 워크로드가 가장 까다로움. 먼저 잡으면 나머지는 쉬움.

### 리소스
1. **Namespace** `meeting-notes`
2. **Secret** `mysql-secret`
   - `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`
   - `kubectl create secret generic`으로 생성. yaml은 커밋 X (`.example`만 커밋).
3. **PVC** `mysql-pvc` (5Gi)
   - Docker Desktop 기본 StorageClass `hostpath` 사용 → 자동 프로비저닝.
4. **StatefulSet** (Deployment 아닌 이유: 안정적 이름과 스토리지 보장)
   - replicas: 1 (학습용 단일 인스턴스)
   - image: `mysql:8.0`
   - envFrom: `mysql-secret`
   - volumeMount: `/var/lib/mysql` ← PVC
   - resources: requests `256Mi/250m`, limits `512Mi/500m`
   - liveness/readinessProbe: `mysqladmin ping`
5. **Service** `mysql-svc` (ClusterIP, port 3306)
   - 내부 DNS: `mysql-svc.meeting-notes.svc.cluster.local`
   - 외부 노출 X

### 검증
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/mysql/
kubectl -n meeting-notes get pods -w        # Running 확인
kubectl -n meeting-notes port-forward svc/mysql-svc 3307:3306
# 로컬 backend에서 DB_HOST=localhost DB_PORT=3307로 bootRun 동작 확인
```

### 잠재적 함정
- Windows에서 `hostpath` 권한 이슈 가능 → 안 되면 `subPath` 트릭으로 우회.
- 기존 docker-compose MySQL(3306)과 포트 충돌 → port-forward는 3307 사용.

## 5. Step 2 — Backend on K8s

### 선결 작업 (백엔드 코드 수정)
- `backend/build.gradle`에 `spring-boot-starter-actuator` 추가.
- `backend/src/main/resources/application-k8s.yml` 신규 추가 — health probe 엔드포인트(`/actuator/health/liveness`, `/readiness`) 공개.
- `backend/Dockerfile` 추가.

### Dockerfile (multi-stage)
- Stage 1 (`gradle:8-jdk21`): `./gradlew bootJar` → `build/libs/*.jar`
- Stage 2 (`eclipse-temurin:21-jre`): jar 복사, `ENTRYPOINT ["java","-jar","app.jar"]`
- 빌드: `docker build -t meeting-notes-backend:dev ./backend`

### 리소스
1. **ConfigMap** `backend-config`
   - `DB_HOST=mysql-svc`, `DB_PORT=3306`, `DB_NAME=meeting_notes`
   - `CORS_ORIGIN=http://meeting-notes.local`
   - `SPRING_PROFILES_ACTIVE=k8s`
2. **Secret** `backend-secret`
   - `DB_USER`, `DB_PASSWORD` (mysql-secret과 동일 값), `JWT_SECRET`
3. **Deployment** `backend`
   - replicas: 1 (추후 2로 늘려 무중단 배포 실험 가능)
   - image: `meeting-notes-backend:dev`, `imagePullPolicy: IfNotPresent`
   - envFrom: configMapRef + secretRef
   - resources: requests `256Mi/250m`, limits `1Gi/1000m`
   - **livenessProbe**: `GET /actuator/health/liveness`
   - **readinessProbe**: `GET /actuator/health/readiness` — DB 끊기면 트래픽 차단
4. **Service** `backend-svc` (ClusterIP, port 8080)

### 검증
```bash
docker build -t meeting-notes-backend:dev ./backend
kubectl apply -f k8s/backend/
kubectl -n meeting-notes port-forward svc/backend-svc 8081:8080
curl http://localhost:8081/actuator/health    # {"status":"UP"}
```

## 6. Step 3 — Frontend + Ingress

### 선결 작업
- `frontend/Dockerfile`, `frontend/nginx.conf` 추가.
- 프론트 API 베이스 URL: 빌드 시 `VITE_API_BASE_URL=/api`로 주입.
  - `frontend/src/api/axios.js`가 `import.meta.env.VITE_API_BASE_URL`을 사용하므로 코드 수정 불필요.
- ingress-nginx 컨트롤러 설치 (1회):
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
  ```
- Windows `C:\Windows\System32\drivers\etc\hosts`에 추가:
  ```
  127.0.0.1 meeting-notes.local
  ```

### Dockerfile (multi-stage)
- Stage 1 (`node:20-alpine`): `npm ci && VITE_API_BASE_URL=/api npm run build` → `dist/`
- Stage 2 (`nginx:1.27-alpine`): `dist/` → `/usr/share/nginx/html`, `nginx.conf` 복사

### nginx.conf
- 정적 파일 서빙
- **SPA fallback**: `try_files $uri /index.html;` — React Router 새로고침 404 방지
- `/api` 프록시는 안 함 (Ingress가 담당)

### 리소스
1. **Deployment** `frontend`
   - replicas: 1
   - image: `meeting-notes-frontend:dev`, `imagePullPolicy: IfNotPresent`
   - resources: requests `32Mi/50m`, limits `128Mi/200m`
   - liveness/readinessProbe: `GET /`
2. **Service** `frontend-svc` (ClusterIP, port 80)
3. **Ingress** `meeting-notes-ingress`
   - ingressClassName: `nginx`
   - host: `meeting-notes.local`
   - rules (path type `Prefix`):
     - `/api` → `backend-svc:8080`
     - `/`    → `frontend-svc:80`
   - 순서 중요: `/api`가 먼저 매칭되도록.

### 최종 검증
```bash
docker build -t meeting-notes-frontend:dev ./frontend
kubectl apply -f k8s/frontend/
# 브라우저 → http://meeting-notes.local
# 로그인 → 페이지 생성 → 자동저장 → 새로고침 → 정상 동작 확인
```

## 7. 운영 사항

- **이미지 갱신**: 코드 수정 → `docker build` → `kubectl rollout restart deployment/<name> -n meeting-notes`
- **로그**: `kubectl -n meeting-notes logs -f deploy/backend`
- **롤백**: `kubectl -n meeting-notes rollout undo deployment/backend`
- **민감정보**: `k8s/**/secret.yaml`은 `.gitignore`. `secret.yaml.example`만 커밋.
- **로컬 개발 흐름 유지**: docker-compose, bootRun, npm run dev는 그대로 동작해야 함 — K8s는 추가 옵션이지 대체가 아님.

## 8. 성공 기준 (Definition of Done)

- [ ] `kubectl -n meeting-notes get all` 결과: 모든 Pod `Running`, 모든 Service Endpoints 존재.
- [ ] 브라우저에서 `http://meeting-notes.local` 접속 → 로그인 → 페이지 생성 → 자동저장 → 새로고침 후에도 데이터 유지.
- [ ] backend Pod 삭제 시 K8s가 자동 재생성 (`kubectl delete pod ...` 후 `get pods`로 확인).
- [ ] MySQL Pod 재시작 후에도 데이터 유지 (PVC 영속화 확인).
- [ ] 기존 docker-compose 로컬 개발 흐름이 여전히 동작.
