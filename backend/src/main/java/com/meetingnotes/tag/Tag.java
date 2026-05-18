package com.meetingnotes.tag;

import com.meetingnotes.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tags", uniqueConstraints = @UniqueConstraint(columnNames = {"name", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder
    public Tag(String name, User user) {
        this.name = name;
        this.user = user;
    }
}
