package com.meetingnotes.page;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByUserIdAndParentIsNullOrderBySortOrderAsc(Long userId);

    @Query("SELECT p FROM Page p WHERE p.user.id = :userId AND (p.title LIKE %:q% OR p.content LIKE %:q%)")
    List<Page> searchByKeyword(@Param("userId") Long userId, @Param("q") String q);

    // 사용자의 즐겨찾기 페이지를 제목순으로 조회
    List<Page> findByUserIdAndFavoriteTrueOrderByTitleAsc(Long userId);

    // 트리 빌드용 — 사용자의 모든 페이지를 단일 쿼리로 (sortOrder 기준 정렬, 부모 fetch join으로 children lazy load 회피)
    @Query("SELECT p FROM Page p LEFT JOIN FETCH p.parent WHERE p.user.id = :userId ORDER BY p.sortOrder ASC")
    List<Page> findAllByUserIdForTree(@Param("userId") Long userId);

    // 특정 태그를 가진 사용자 소유 페이지 조회 (제목순)
    @Query("SELECT DISTINCT p FROM Page p JOIN p.tags t WHERE p.user.id = :userId AND t.id = :tagId ORDER BY p.title ASC")
    List<Page> findByUserIdAndTagId(@Param("userId") Long userId, @Param("tagId") Long tagId);
}
