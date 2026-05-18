package com.meetingnotes.page;

import com.meetingnotes.common.BaseEntity;
import com.meetingnotes.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Page extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Page parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<Page> children = new ArrayList<>();

    @Column(length = 10)
    private String emoji;

    @Column(name = "sort_order")
    private int sortOrder;

    @Builder
    public Page(String title, String content, User user, Page parent, String emoji, int sortOrder) {
        this.title = title;
        this.content = content;
        this.user = user;
        this.parent = parent;
        this.emoji = emoji;
        this.sortOrder = sortOrder;
    }

    public void update(String title, String content, String emoji) {
        this.title = title;
        this.content = content;
        this.emoji = emoji;
    }

    public void setParent(Page parent) {
        this.parent = parent;
    }
}
