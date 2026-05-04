import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// Ikona X (Twitter)
export const XIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="4 4 42 42"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M 11 4 C 7.134 4 4 7.134 4 11 L 4 39 C 4 42.866 7.134 46 11 46 L 39 46 C 42.866 46 46 42.866 46 39 L 46 11 C 46 7.134 42.866 4 39 4 L 11 4 z M 13.085938 13 L 21.023438 13 L 26.660156 21.009766 L 33.5 13 L 36 13 L 27.789062 22.613281 L 37.914062 37 L 29.978516 37 L 23.4375 27.707031 L 15.5 37 L 13 37 L 22.308594 26.103516 L 13.085938 13 z M 16.914062 15 L 31.021484 35 L 34.085938 35 L 19.978516 15 L 16.914062 15 z"></path>
  </svg>
);

// Ikona Instagram
export const InstagramIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="3 3 44 44"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M 16 3 C 8.83 3 3 8.83 3 16 L 3 34 C 3 41.17 8.83 47 16 47 L 34 47 C 41.17 47 47 41.17 47 34 L 47 16 C 47 8.83 41.17 3 34 3 L 16 3 z M 37 11 C 38.1 11 39 11.9 39 13 C 39 14.1 38.1 15 37 15 C 35.9 15 35 14.1 35 13 C 35 11.9 35.9 11 37 11 z M 25 14 C 31.07 14 36 18.93 36 25 C 36 31.07 31.07 36 25 36 C 18.93 36 14 31.07 14 25 C 14 18.93 18.93 14 25 14 z M 25 16 C 20.04 16 16 20.04 16 25 C 16 29.96 20.04 34 25 34 C 29.96 34 34 29.96 34 25 C 34 20.04 29.96 16 25 16 z"></path>
  </svg>
);

// Ikona Facebook
export const FacebookIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="4 4 42 42"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M37,19h-2c-2.14,0-3,0.5-3,2 v3h5l-1,5h-4v15h-5V29h-4v-5h4v-3c0-4,2-7,6-7c2.9,0,4,1,4,1V19z"></path>
  </svg>
);

//Ikona Quotes
export const QuoteIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 130 131"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M38.8497 34.6699L35.5469 29.5527C12.6953 45.0312 0 63.8379 0 79.3164C0 94.2831 10.92 101.32 20.1866 101.32C31.8662 101.32 40.1172 91.3397 40.1172 80.8515C40.1172 72.0254 34.5312 64.4765 27.04 61.66C24.8828 60.8904 22.8516 60.2518 22.8516 56.5428C22.8516 51.8105 26.2803 44.7774 38.8497 34.6699ZM89.2491 34.6699L85.9463 29.5527C63.3466 45.0312 50.3994 63.8379 50.3994 79.3164C50.3994 94.2831 61.5713 101.32 70.8378 101.32C82.6434 101.32 91.0244 91.3397 91.0244 80.8515C91.0244 72.0254 85.3125 64.4765 77.5653 61.66C75.4081 60.8904 73.5028 60.2518 73.5028 56.5428C73.5028 51.8105 77.0575 44.7733 89.245 34.6658L89.2491 34.6699Z"
      fill="currentColor"
    />
  </svg>
);

export const RingsIcon = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 1024 708"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
    style={{ vectorEffect: 'non-scaling-stroke' }}
  >
    <g transform="matrix(0.839309,0,0,0.842583,75.8554,8.82571)">
      {/* Mały krąg */}
      <g transform="matrix(1.45231,0,0,1.45231,-223.934,-75.1826)">
        <circle
          cx="512"
          cy="457.172"
          r="140.957"
          className="stroke-current"
          strokeWidth="1"
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
      </g>
      {/* Średni krąg */}
      <g transform="matrix(2.5112,0,0,2.5112,-766.085,-559.276)">
        <path
          d="M409.299,553.679C385.581,528.451 371.043,494.496 371.043,457.172C371.043,379.376 434.204,316.215 512,316.215C589.796,316.215 652.957,379.376 652.957,457.172C652.957,494.596 638.341,528.632 614.511,553.881"
          className="stroke-current"
          strokeWidth="1"
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
      </g>
      {/* Duży krąg */}
      <g transform="matrix(1.19146,0,0,1.18683,-90.3783,-951.344)">
        <path
          d="M139.406,1504.69C138.714,1503.44 138.027,1502.18 137.347,1500.92C104.705,1440.46 86.164,1371.22 86.164,1297.67C86.164,1061.73 276.975,870.178 512,870.178C747.025,870.178 937.836,1061.73 937.836,1297.67C937.836,1371.63 919.089,1441.23 886.109,1501.93"
          className="stroke-current"
          strokeWidth="1"
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
      </g>
    </g>
  </svg>
);
