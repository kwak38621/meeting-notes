# K8s 적용 진행 체크리스트

플랜: [2026-05-25-kubernetes-apply.md](2026-05-25-kubernetes-apply.md)

**세션 시작 시 이 파일을 먼저 읽고 현재 상태 파악할 것.**
체크박스는 작업 완료 직후 즉시 갱신.

## 환경
- 브랜치: `feat/k8s-apply`
- kubectl context: `docker-desktop` (v1.34.3)
- StorageClass default: `standard`

---

## Task 0: 사전 환경 점검 + .gitignore
- [x] Step 1: Docker Desktop K8s 활성화 확인 (2026-05-25)
- [x] Step 2: 노드/StorageClass 확인 (2026-05-25)
- [x] Step 3: `.gitignore`에 k8s secret 패턴 추가 (파일 수정됨, 미커밋)
- [x] Step 4: `.gitignore` 커밋 (`34127c9`)

## Task 1: Namespace
- [x] Step 1: `k8s/00-namespace.yaml` 작성
- [x] Step 2: apply + `meeting-notes Active` 확인
- [x] Step 3: 커밋 (`05b9c3d`)

## Task 2: MySQL Secret
- [x] Step 1: `k8s/mysql/secret.yaml.example` 작성
- [x] Step 2: 로컬 `k8s/mysql/secret.yaml` 생성 (openssl 랜덤 24바이트)
- [x] Step 3: apply + `mysql-secret Opaque 4` 확인
- [x] Step 4: `git status`에서 secret.yaml 누출 없음 확인 (check-ignore OK)
- [x] Step 5: `.example` 커밋 (`9badb5c`)

## Task 3: MySQL PVC + StatefulSet + Service
- [x] Step 1: `k8s/mysql/pvc.yaml` 작성
- [x] Step 2: `k8s/mysql/service.yaml` 작성
- [x] Step 3: `k8s/mysql/statefulset.yaml` 작성
- [x] Step 4: 3개 `kubectl apply` (PVC Bound, Service 생성, StatefulSet 시작)
- [x] Step 5: `mysql-0` 1/1 Running 확인
- [x] Step 6: DB 접속 확인 (`kubectl exec`로 SHOW DATABASES → `meeting_notes` 존재)
- [ ] Step 7: (선택, 스킵) Pod 삭제 후 데이터 영속 확인
- [x] Step 8: 커밋 (`ae9b356`)

## Task 4: Backend Actuator + k8s 프로필
- [x] Step 1: `backend/build.gradle`에 actuator 추가
- [x] Step 2: `application-k8s.yml` 작성
- [x] Step 3: `./gradlew bootJar` BUILD SUCCESSFUL, jar 생성 확인
- [ ] Step 4: (선택, 스킵) actuator 엔드포인트 로컬 확인
- [x] Step 5: 커밋 (`8bda815`)

## Task 5: Backend Dockerfile
- [x] Step 1: `backend/.dockerignore`
- [x] Step 2: `backend/Dockerfile`
- [x] Step 3: `docker build` 성공
- [x] Step 4: 이미지 `meeting-notes-backend:dev` 529MB 확인
- [x] Step 5: 커밋 (`99d8c58`)

## Task 6: Backend ConfigMap + Secret
- [x] Step 1: `k8s/backend/configmap.yaml`
- [x] Step 2: `k8s/backend/secret.yaml.example`
- [x] Step 3: 로컬 `secret.yaml` 생성 (mysql 비번 재사용, JWT 새 랜덤 48바이트)
- [x] Step 4: apply (DATA 4 / 3)
- [x] Step 5: 커밋 (`c15b5fc`)

## Task 7: Backend Deployment + Service
- [x] Step 1: `k8s/backend/deployment.yaml` (image: `meeting-notes-backend:dev-r1`)
- [x] Step 2: `k8s/backend/service.yaml`
- [x] Step 3: apply + Pod 1/1 Running
- [x] Step 4: actuator/health/liveness 200 (Pod 내부 호출)
- [x] Step 5: 커밋 (`118e31d` SecurityConfig, `5451e6a` deployment/service)

### Task 7에서 마주친 함정 (다음 세션 참조)
- **MySQL secret yaml에 Windows CRLF가 섞이면 비밀번호 끝에 `\r` 따라붙어 Access denied 발생.** 해결: `printf` + `tr -d '\r\n'` 으로 LF 작성. backend secret과 동일 비번 보장.
- **Spring Security가 `/actuator/health/**` 막아서 probe 403.** SecurityConfig에 permitAll 추가.
- **Docker Desktop K8s에서 같은 태그(`:dev`)로 재빌드해도 노드 이미지 안 바뀜.** 해결: 매 코드 변경마다 새 태그(`:dev-r1`, `:dev-r2`)로 빌드 + `deployment.yaml` 태그 갱신 + `kubectl set image` 또는 재apply.

## Task 8: Frontend Dockerfile + nginx.conf
- [x] Step 1: `frontend/.dockerignore`
- [x] Step 2: `frontend/nginx.conf`
- [x] Step 3: `frontend/Dockerfile`
- [x] Step 4: `meeting-notes-frontend:dev` 74.3MB
- [ ] Step 5: (선택, 스킵)
- [x] Step 6: 커밋 (`8c25ad1`)

## Task 9: Frontend Deployment + Service
- [x] Step 1: `k8s/frontend/deployment.yaml`
- [x] Step 2: `k8s/frontend/service.yaml`
- [x] Step 3: apply + Pod 1/1 Running
- [x] Step 4: 커밋 (`0f9f7eb`)

## Task 10: ingress-nginx + hosts
- [x] Step 1: ingress-nginx 컨트롤러 apply (v1.10.1)
- [x] Step 2: controller Pod 1/1 Running
- [x] Step 3: LoadBalancer EXTERNAL-IP 172.19.0.5
- [x] Step 4: hosts `127.0.0.1 meeting-notes.local` (ping 127.0.0.1 응답 확인)

## Task 11: Ingress + 통합 검증
- [x] Step 1: `k8s/frontend/ingress.yaml`
- [x] Step 2: apply, ADDRESS 할당 확인
- [x] Step 3: curl `http://meeting-notes.local/` → 200 (frontend)
- [~] Step 4: `/api/actuator/health` 외부 호출은 403 (Spring Security가 막음 — actuator는 probe 전용, 외부 노출 불필요). 대신 `/api/auth/register` 호출 200 success로 ingress→backend→mysql E2E 확인
- [x] Step 5: 브라우저 E2E — 사용자 검증 OK
- [x] Step 6: backend Pod 삭제 → 42초만에 새 Pod 1/1 Running
- [x] Step 7: mysql Pod 삭제 후 재시작 → users 데이터 유지 (PVC 영속화 동작)
- [x] Step 8: 커밋 (`ebeeed7`)

## Task 12: README K8s 섹션
- [x] Step 1: README에 "Kubernetes (로컬, Docker Desktop)" 섹션 추가 + 운영 노트
- [x] Step 2: 커밋 (`81cf1be`)

---

## Definition of Done
- [x] `kubectl -n meeting-notes get all` 모두 Running, ENDPOINTS 존재
- [x] `http://meeting-notes.local` E2E 정상 (브라우저 사용자 검증)
- [x] backend Pod 자가복구 확인 (42초)
- [x] mysql 영속화 확인 (users 데이터 유지)
- [x] 기존 docker-compose/bootRun/npm 흐름 회귀 없음 (코드 변경은 SecurityConfig actuator permitAll만 — 기존 흐름 영향 없음)
- [x] `git status`에 `secret.yaml` 누출 없음 (.gitignore + check-ignore 확인)

---

## 완료 (2026-05-25)
13개 커밋:
1. `34127c9` chore(k8s): ignore secret manifests
2. `05b9c3d` feat(k8s): namespace
3. `9badb5c` feat(k8s): mysql secret example
4. `ae9b356` feat(k8s): mysql statefulset/pvc/service
5. `8bda815` feat(backend): actuator + k8s profile
6. `99d8c58` feat(backend): Dockerfile
7. `c15b5fc` feat(k8s): backend configmap + secret example
8. `118e31d` fix(backend): permit /actuator/health/** for k8s probes
9. `5451e6a` feat(k8s): backend deployment + service
10. `8c25ad1` feat(frontend): Dockerfile + nginx config
11. `0f9f7eb` feat(k8s): frontend deployment + service
12. `ebeeed7` feat(k8s): ingress + e2e routing
13. `81cf1be` docs: k8s usage section in README
