import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getQuoteStats } from '../../services/adminApi';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem('rma_admin_token');

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', {
        replace: true,
      });

      return;
    }

    async function loadStats() {
      try {
        setLoading(true);
        setError('');

        const data = await getQuoteStats(token);

        setStats(data.data);
      } catch (err) {
        console.error(err);

        localStorage.removeItem('rma_admin_token');
        localStorage.removeItem('rma_admin_user');

        navigate('/admin/login', {
          replace: true,
        });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [navigate, token]);

  if (loading) {
    return (
      <section className="adminContent">
        <div className="adminLoading">
          Loading dashboard...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="adminContent">

        <div className="adminErrorState">

          <span className="adminLabel">
            ERROR
          </span>

          <h2>
            Dashboard could not be loaded.
          </h2>

          <p>
            {error}
          </p>

        </div>

      </section>
    );
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">

        <div>
          <span className="adminLabel">
            RMA ADMINISTRATION
          </span>

          <h1>
            Dashboard
          </h1>
        </div>

        <span className="adminDate">
          Quote Management
        </span>

      </div>


      <div className="adminStatsGrid">

        <Link
          to="/admin/quotes"
          className="adminStatCard"
        >
          <span>
            Total Requests
          </span>

          <strong>
            {stats?.total || 0}
          </strong>

          <small>
            View all requests ↗
          </small>
        </Link>


        <Link
          to="/admin/quotes"
          className="adminStatCard"
        >
          <span>
            Unread
          </span>

          <strong>
            {stats?.unread || 0}
          </strong>

          <small>
            Requires attention
          </small>
        </Link>


        <Link
          to="/admin/quotes?status=new"
          className="adminStatCard"
        >
          <span>
            New
          </span>

          <strong>
            {stats?.new || 0}
          </strong>

          <small>
            Newly received
          </small>
        </Link>


        <Link
          to="/admin/quotes?status=reviewing"
          className="adminStatCard"
        >
          <span>
            Reviewing
          </span>

          <strong>
            {stats?.reviewing || 0}
          </strong>

          <small>
            Under review
          </small>
        </Link>


        <Link
          to="/admin/quotes?status=contacted"
          className="adminStatCard"
        >
          <span>
            Contacted
          </span>

          <strong>
            {stats?.contacted || 0}
          </strong>

          <small>
            Customer contacted
          </small>
        </Link>


        <Link
          to="/admin/quotes?status=quoted"
          className="adminStatCard"
        >
          <span>
            Quoted
          </span>

          <strong>
            {stats?.quoted || 0}
          </strong>

          <small>
            Offer submitted
          </small>
        </Link>


        <Link
          to="/admin/quotes?status=closed"
          className="adminStatCard"
        >
          <span>
            Closed
          </span>

          <strong>
            {stats?.closed || 0}
          </strong>

          <small>
            Completed requests
          </small>
        </Link>

      </div>


      <div className="adminDashboardAction">

        <div>
          <span>
            QUOTE REQUESTS
          </span>

          <h2>
            Manage incoming
            <br />
            customer requests.
          </h2>
        </div>

        <Link to="/admin/quotes">
          View Requests ↗
        </Link>

      </div>


      <div className="adminDashboardInfo">

        <div>

          <span className="adminLabel">
            REQUEST FLOW
          </span>

          <h3>
            Lead management workflow
          </h3>

        </div>

        <div className="adminWorkflow">

          <div>
            <span>01</span>

            <strong>
              New
            </strong>

            <p>
              Customer submits a new website request.
            </p>
          </div>


          <div>
            <span>02</span>

            <strong>
              Reviewing
            </strong>

            <p>
              Request and technical requirements are reviewed.
            </p>
          </div>


          <div>
            <span>03</span>

            <strong>
              Contacted
            </strong>

            <p>
              RMA team contacts the customer.
            </p>
          </div>


          <div>
            <span>04</span>

            <strong>
              Quoted
            </strong>

            <p>
              Commercial offer is prepared and submitted.
            </p>
          </div>


          <div>
            <span>05</span>

            <strong>
              Closed
            </strong>

            <p>
              Request process is completed.
            </p>
          </div>

        </div>

      </div>

    </section>
  );
}