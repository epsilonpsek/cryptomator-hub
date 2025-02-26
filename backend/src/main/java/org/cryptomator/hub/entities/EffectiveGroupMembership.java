package org.cryptomator.hub.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.panache.common.Parameters;
import org.hibernate.annotations.Immutable;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.persistence.EmbeddedId;
import javax.persistence.Entity;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Immutable
@Table(name = "effective_group_membership")
@NamedQuery(name = "EffectiveGroupMembership.countEGUs", query = """
				SELECT count( DISTINCT u)
				FROM User u
				INNER JOIN EffectiveGroupMembership egm	ON u.id = egm.id.memberId
				WHERE egm.id.groupId = :groupId
		""")
public class EffectiveGroupMembership extends PanacheEntityBase {

	@EmbeddedId
	public EffectiveGroupMembershipId id;

	public String path;

	public static long countEffectiveGroupUsers(String groupdId) {
		return EffectiveGroupMembership.count("#EffectiveGroupMembership.countEGUs", Parameters.with("groupId", groupdId));
	}

	@Embeddable
	public static class EffectiveGroupMembershipId implements Serializable {

		@Column(name = "group_id")
		public String groupId;

		@Column(name = "member_id")
		public String memberId;

		@Override
		public boolean equals(Object o) {
			if (this == o) return true;
			if (o instanceof EffectiveGroupMembershipId egmId) {
				return Objects.equals(groupId, egmId.groupId) //
						&& Objects.equals(memberId, egmId.memberId);
			}
			return false;
		}

		@Override
		public int hashCode() {
			return Objects.hash(groupId, memberId);
		}

		@Override
		public String toString() {
			return "EffectiveGroupMembershipId{" +
					"groupId='" + groupId + '\'' +
					", memberId='" + memberId + '\'' +
					'}';
		}
	}
}
