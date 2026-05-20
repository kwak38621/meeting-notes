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
}
