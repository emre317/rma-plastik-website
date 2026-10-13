import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

import { useAdminSession } from './AdminSession';
import { ROLES, roleLabel } from './roles';

/* Panel page for one area; other roles see a short explanation instead */
export default function RequireArea({ area, children }) {
  const { admin, can } = useAdminSession();

  if (can(area)) return children;

  const allowed = ROLES.filter((role) => role.id === 'admin' || role.id === area).map((role) => role.label).join(' veya ');

  return (
    <section className="adminContent">
      <div className="adState">
        <span className="adStateIcon" aria-hidden="true"><ShieldOff /></span>
        <h2>Bu Bölüme Erişiminiz Yok</h2>
        <p>Rolünüz: <strong>{roleLabel(admin?.role)}</strong>. Bu sayfa {allowed} rolündeki kullanıcılar içindir. Gerekirse bir yöneticiden rolünüzü değiştirmesini isteyin.</p>
        <Link to="/admin" className="cmsButton">Özete Dön</Link>
      </div>
    </section>
  );
}
