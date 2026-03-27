-- Recalculate kpi_achievement and weighted_score for all tasks
UPDATE public.tasks
SET 
  kpi_achievement = CASE 
    WHEN kpi_target_percent > 0 THEN LEAST(100, ROUND((progress / kpi_target_percent) * 100, 2))
    ELSE 0
  END,
  weighted_score = ROUND(task_weight * (progress / 100), 4);