-- Developer-only read access. Ordinary authenticated users retain no research access.
CREATE TABLE public.rain_research_admins (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rain_research_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_research_admins FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.rain_research_admins TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_research_admins TO service_role;
CREATE POLICY research_membership_self ON public.rain_research_admins FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND enabled);
GRANT SELECT ON public.rain_notification_evaluations TO authenticated;
CREATE POLICY research_evaluations_developer_own ON public.rain_notification_evaluations FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
GRANT SELECT ON public.rain_evaluation_images TO authenticated;
CREATE POLICY research_images_developer_own ON public.rain_evaluation_images FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.rain_notification_evaluations e WHERE e.id=evaluation_id AND e.owner_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
GRANT SELECT ON public.rain_area_shadow_results TO authenticated;
CREATE POLICY research_shadow_developer_own ON public.rain_area_shadow_results FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.rain_notification_evaluations e WHERE e.id=evaluation_id AND e.owner_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
GRANT SELECT ON public.rain_evaluation_runs,public.rain_image_runs,public.rain_shadow_runs TO authenticated;
CREATE POLICY research_evaluation_health_developer ON public.rain_evaluation_runs FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
CREATE POLICY research_image_health_developer ON public.rain_image_runs FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
CREATE POLICY research_shadow_health_developer ON public.rain_shadow_runs FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
GRANT SELECT(target_id,checked_at,current_status,source_valid_at) ON public.rain_diagnostic_history TO authenticated;
CREATE POLICY research_diagnostics_developer_own ON public.rain_diagnostic_history FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.watch_targets t WHERE t.id=target_id AND t.owner_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
CREATE UNIQUE INDEX rain_evaluations_id_owner_idx ON public.rain_notification_evaluations(id,owner_id);
CREATE TABLE public.rain_research_ground_reports (
 evaluation_id uuid NOT NULL,
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 observed_at timestamptz NOT NULL,
 weather text NOT NULL CHECK(weather IN ('RAIN','NO_RAIN','UNKNOWN')),
 report_source text NOT NULL CHECK(report_source IN ('AT_LOCATION','CAMERA','NEARBY_REFERENCE')),
 location_confirmed boolean NOT NULL DEFAULT false,
 note text NOT NULL DEFAULT '' CHECK(char_length(note)<=300),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(evaluation_id,observed_at),
 FOREIGN KEY(evaluation_id,owner_id) REFERENCES public.rain_notification_evaluations(id,owner_id) ON DELETE CASCADE,
 CHECK(report_source='NEARBY_REFERENCE' OR location_confirmed)
);
CREATE INDEX rain_research_reports_owner_idx ON public.rain_research_ground_reports(owner_id);
ALTER TABLE public.rain_research_ground_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_research_ground_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.rain_research_ground_reports TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_research_ground_reports TO service_role;
CREATE POLICY research_ground_developer_own ON public.rain_research_ground_reports FOR ALL TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled))
 WITH CHECK(owner_id=(SELECT auth.uid())
 AND EXISTS(SELECT 1 FROM public.rain_notification_evaluations e WHERE e.id=evaluation_id AND e.owner_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.rain_research_admins a WHERE a.owner_id=(SELECT auth.uid()) AND a.enabled));
CREATE FUNCTION public.stamp_rain_research_report() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.observed_at>now()+interval '1 minute' THEN RAISE EXCEPTION 'RESEARCH_REPORT_FUTURE_TIME'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.evaluation_id IS DISTINCT FROM OLD.evaluation_id
  OR NEW.observed_at IS DISTINCT FROM OLD.observed_at THEN RAISE EXCEPTION 'RESEARCH_REPORT_IDENTITY_IMMUTABLE'; END IF;
 ELSE NEW.created_at=now(); END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stamp_rain_research_report() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stamp_rain_research_report BEFORE INSERT OR UPDATE ON public.rain_research_ground_reports
 FOR EACH ROW EXECUTE FUNCTION public.stamp_rain_research_report();
-- No memberships are seeded by migration. Grant a verified developer separately.
