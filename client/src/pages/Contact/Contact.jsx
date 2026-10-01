import { useState } from 'react';
import products from '../../data/products';
import { submitQuote } from '../../services/api';

const initialForm = {
  company: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  product: '',
  capacity: '',
  quantity: '',
  application: '',
  message: '',
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus('loading');
    setFeedback('');

    try {
      const response = await submitQuote(form);

      setStatus('success');
      setFeedback(response.message);
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setFeedback(error.message);
    }
  }

  return (
    <main className="contactPage">

      <section className="internalHero contactPageHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>
              06 / CONTACT
            </span>

            <span>
              START A PROJECT
            </span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              TALK TO RMA
            </p>

            <h1>
              Tell us what
              <span>you need.</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              Share your product, application or custom manufacturing
              requirement with our team.
            </p>

            <span>
              SALES / ENGINEERING
            </span>

          </div>

        </div>
      </section>


      <section className="quoteSection">

        <div className="container">

          <div className="quoteHeader">

            <div>
              <span className="sectionIndex">
                REQUEST / 01
              </span>

              <p className="eyebrow">
                PROJECT INFORMATION
              </p>
            </div>

            <div>
              <h2>
                Request a
                <span>solution.</span>
              </h2>

              <p>
                Provide the basic project information below. More technical
                details can be discussed with the RMA team after submission.
              </p>
            </div>

          </div>


          <div className="quoteLayout">

            <aside className="quoteSidebar">

              <span className="quoteSidebarLabel">
                CONTACT
              </span>

              <h3>
                Let&apos;s understand
                your requirement.
              </h3>

              <p>
                Complete the form with as much information as possible so the
                relevant product and manufacturing requirements can be reviewed.
              </p>

              <div className="quoteSidebarDetails">

                <div>
                  <span>Locations</span>
                  <strong>
                    Mersin / Istanbul
                  </strong>
                </div>

                <div>
                  <span>Country</span>
                  <strong>
                    Türkiye
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    info@rmaplastik.com
                  </strong>
                </div>

              </div>

            </aside>


            <form
              className="quoteForm"
              onSubmit={handleSubmit}
            >

              <div className="formGrid">

                <label className="formField">
                  <span>
                    Company *
                  </span>

                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    required
                    placeholder="Company name"
                  />
                </label>


                <label className="formField">
                  <span>
                    Contact Name *
                  </span>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Full name"
                  />
                </label>


                <label className="formField">
                  <span>
                    Email *
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="name@company.com"
                  />
                </label>


                <label className="formField">
                  <span>
                    Phone
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+90 ..."
                  />
                </label>


                <label className="formField">
                  <span>
                    Country
                  </span>

                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </label>


                <label className="formField">
                  <span>
                    Product
                  </span>

                  <select
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select product
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.name}
                      >
                        {product.name}
                      </option>
                    ))}

                    <option value="Custom Requirement">
                      Custom Requirement
                    </option>
                  </select>
                </label>


                <label className="formField">
                  <span>
                    Required Capacity
                  </span>

                  <input
                    type="text"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="e.g. 10,000 L"
                  />
                </label>


                <label className="formField">
                  <span>
                    Quantity
                  </span>

                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="Quantity"
                  />
                </label>


                <label className="formField formFieldFull">
                  <span>
                    Application
                  </span>

                  <input
                    type="text"
                    name="application"
                    value={form.application}
                    onChange={handleChange}
                    placeholder="Chemical storage, water storage, OEM project..."
                  />
                </label>


                <label className="formField formFieldFull">
                  <span>
                    Project Details *
                  </span>

                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows="7"
                    placeholder="Please describe your requirement, operating conditions and other relevant project information."
                  />
                </label>

              </div>


              <div className="quoteFormBottom">

                <p>
                  By submitting this form, you confirm that the provided
                  information may be used to respond to your request.
                </p>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="quoteSubmit"
                >
                  <span>
                    {status === 'loading'
                      ? 'Sending...'
                      : 'Submit Request'}
                  </span>

                  <span>
                    ↗
                  </span>
                </button>

              </div>


              {feedback && (
                <div
                  className={`quoteFeedback ${status}`}
                >
                  {feedback}
                </div>
              )}

            </form>

          </div>

        </div>

      </section>

    </main>
  );
}