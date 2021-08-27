package org.cryptomator.hub.persistence.entities;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.PersistenceException;
import javax.transaction.Transactional;
import java.util.List;

@ApplicationScoped
@Transactional
public class UserDao {

	@PersistenceContext()
	EntityManager em;

	@Inject
	BasicDao basicDao;

	public List<User> getAll() {
		return basicDao.getAll(User.class);
	}

	public List<User> getAllWithDevices() {
		return em.createNamedQuery("User.includingDevices").getResultList();
	}

	public List<User> getAllWithDevicesAndAccess() {
		return em.createNamedQuery("User.includingDevicesAndVaults").getResultList();
	}

	public User getWithDevicesAndAccess(String userId) {
		try {
			return em.createNamedQuery("User.withDevicesAndAccess", User.class)
					.setParameter("userId", userId)
					.getSingleResult();
		} catch (NoResultException e) {
			return null;
		}
	}

	public User get(String id) {
		return basicDao.get(User.class, id);
	}

	public Long count() {
		return em.createNamedQuery("User.count", Long.class).getSingleResult();
	}

	public String persist(User user) {
		try {
			return basicDao.persist(user).getId();
		} catch (PersistenceException e) {
			//ConstraintViolation.throwIfConstraintViolated(e);
			throw e;
		}
	}
}
