import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const PersonalizationInfoBanner: React.FC = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('aetraxaBannerDismissed');
    if (!dismissed) setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('aetraxaBannerDismissed', 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-[#151515] border border-white/10 rounded-2xl p-4 shadow-xl z-50"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">
              {t('personalizationInfo' as any)}
            </p>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full text-white/60">
              <XIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PersonalizationInfoBanner;
