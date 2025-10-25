import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

type Task = {
  id: number;
  label: string;
  icon: string;
  blurred?: boolean;
};

const tasks: Task[] = [
  { id: 1, label: 'Supercharger Rebuild', icon: '#2922751717', blurred: true },
  { id: 2, label: 'Snout Porting', icon: '#78418125', blurred: true },
  { id: 3, label: 'Igla', icon: '#2109778876', blurred: true },
  { id: 4, label: 'Snout Rebuild', icon: '#1688045918', blurred: false },
  { id: 5, label: 'Fabrication', icon: '#1688045918', blurred: false }
];

export default function TaskCard() {
  const controls = useAnimation();
  const [hovered, setHovered] = useState(false);
  const [autoRunning, setAutoRunning] = useState(true);

  const scrollerTasks = useMemo(() => [...tasks, ...tasks], []);

  useEffect(() => {
    if (hovered) {
      setAutoRunning(false);
      controls.start({
        y: ['0%', '-50%'],
        transition: {
          duration: 10,
          ease: 'linear',
          repeat: Infinity
        }
      });
    } else {
      setAutoRunning(true);
    }
  }, [hovered, controls]);

  useEffect(() => {
    if (!autoRunning) return;
    controls.start({
      y: ['0%', '-50%'],
      transition: {
        duration: 16,
        ease: 'linear',
        repeat: Infinity
      }
    });
  }, [autoRunning, controls]);

  return (
    <motion.div
      className="task-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div className="task-card__tasks-wrapper">
        <motion.div
          className="task-card__tasks-scroller"
          animate={controls}
          initial={false}
        >
          {scrollerTasks.map((task, index) => {
            const baseIndex = index % tasks.length;
            return (
              <motion.div
                key={`${task.id}-${index}`}
                className={
                  task.blurred
                    ? 'task-card__item task-card__item--blurred'
                    : 'task-card__item'
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: baseIndex * 0.15 }}
                whileHover={{
                  scale: 1.05,
                  filter: 'blur(0px)',
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              >
                <svg viewBox="0 0 24 24" className="task-card__icon">
                  <use href={task.icon}></use>
                </svg>
                <p className="task-card__text">{task.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        className="task-card__footer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <p className="task-card__title">Full Service Shop</p>
        <p className="task-card__subtitle">
          From concept to completion, we provide comprehensive engineering services to bring your
          high-performance supercharger vision to life with racing precision.
        </p>
      </motion.div>
    </motion.div>
  );
}
