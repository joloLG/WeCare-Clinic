import { UserLayout } from '@/components/user/UserLayout';

export default function AboutWeCareClinicPage() {
  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-red-700 mb-4">Welcome to WeCare Animal Bite Clinic</h1>
          <p className="text-xl text-gray-600">Your trusted partner in rabies prevention and animal bite care</p>
        </div>

        {/* About Section */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">About Us</h2>
          <p className="text-gray-700 mb-6">
            WeCare Animal Bite Clinic is a dedicated healthcare facility specializing in the prevention and treatment of animal bites, with a primary focus on rabies prevention. Our team of experienced healthcare professionals is committed to providing compassionate and comprehensive care to all our patients.
          </p>
          <p className="text-gray-700">
            We understand the urgency and anxiety that comes with animal bites, which is why we offer prompt and efficient services to ensure you receive the care you need when you need it most.
          </p>
        </section>

        {/* Mission Section */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Our Mission</h2>
          <p className="text-gray-700">
            To provide accessible, high-quality post-exposure prophylaxis and vaccination services to prevent rabies and other animal bite-related infections. We are committed to educating our community about responsible pet ownership and the importance of timely medical intervention after animal bites.
          </p>
        </section>

        {/* Vision Section */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Our Vision</h2>
          <p className="text-gray-700">
            To be the leading animal bite treatment center in the region, recognized for excellence in patient care, community education, and rabies prevention. We envision a community free from rabies through comprehensive vaccination programs and public awareness initiatives.
          </p>
        </section>

        {/* Services Section */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Our Services</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <li className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Rabies Post-Exposure Prophylaxis (PEP)</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pre-Exposure Vaccination</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Wound Care and Management</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Rabies Education and Awareness</span>
            </li>
          </ul>
        </section>

        {/* Location Section */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Our Location</h2>
          <p className="text-gray-700 mb-6">
            Visit us at our conveniently located clinic for all your animal bite treatment and vaccination needs.
          </p>
          <div className="aspect-w-16 aspect-h-9 w-full">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2235.7868287082983!2d123.8811325649646!3d12.665718871971523!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a0d13fff8aaf73%3A0x522fbc0bf84c6fa!2sSorsogon%20State%20University%20-%20Bulan%20Campus!5e0!3m2!1sen!2sph!4v1758357640125!5m2!1sen!2sph" 
              width="100%" 
              height="450" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg shadow-md"
            ></iframe>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">WeCare Animal Bite Clinic</h3>
            <p className="text-gray-600">Sorsogon State University - Bulan Campus</p>
            <p className="text-gray-600">Bulan, Sorsogon, Philippines</p>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Hours:</span> Monday to Saturday, 8:00 AM - 5:00 PM
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <h3 className="text-xl font-bold text-red-700 mb-2">Need Immediate Assistance?</h3>
          <p className="text-gray-700 mb-4">For emergency cases, please proceed to the nearest hospital emergency room.</p>
          <a 
            href="tel:+639123456789" 
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Emergency Contact: (0912) 345-6789
          </a>
        </div>
      </div>
    </UserLayout>
  );
}
