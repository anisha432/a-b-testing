from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.experiment import Experiment, ExperimentVariant
from app.models.activity import Activity
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentResponse,
    ExperimentListResponse,
    VariantResponse,
)
from app.api.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.get("", response_model=ExperimentListResponse)
async def list_experiments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    experiment_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    query = db.query(Experiment)

    if status_filter:
        query = query.filter(Experiment.status == status_filter)
    if experiment_type:
        query = query.filter(Experiment.experiment_type == experiment_type)
    if search:
        query = query.filter(Experiment.name.ilike(f"%{search}%"))

    total = query.count()
    experiments = (
        query.order_by(Experiment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ExperimentListResponse(
        experiments=[ExperimentResponse.model_validate(e) for e in experiments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return ExperimentResponse.model_validate(experiment)


@router.post("", response_model=ExperimentResponse, status_code=201)
async def create_experiment(
    data: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    experiment = Experiment(
        name=data.name,
        description=data.description,
        hypothesis=data.hypothesis,
        owner=data.owner,
        experiment_type=data.experiment_type,
        primary_metric=data.primary_metric,
        secondary_metrics=data.secondary_metrics,
        start_date=data.start_date,
        end_date=data.end_date,
        control_allocation=data.control_allocation,
        treatment_allocation=data.treatment_allocation,
        target_audience=data.target_audience,
        expected_uplift=data.expected_uplift,
        user_id=current_user.id if current_user else None,
    )
    db.add(experiment)
    db.flush()

    # Create default variants
    if data.variants:
        for v in data.variants:
            variant = ExperimentVariant(
                experiment_id=experiment.id,
                name=v.name,
                description=v.description,
                allocation=v.allocation,
                is_control=1 if v.is_control else 0,
            )
            db.add(variant)
    else:
        # Default control/treatment
        db.add(ExperimentVariant(
            experiment_id=experiment.id,
            name="Control",
            description="Original experience",
            allocation=data.control_allocation,
            is_control=1,
        ))
        db.add(ExperimentVariant(
            experiment_id=experiment.id,
            name="Treatment",
            description="New experience",
            allocation=data.treatment_allocation,
            is_control=0,
        ))

    # Log activity
    db.add(Activity(
        action="experiment_created",
        entity_type="experiment",
        entity_id=experiment.id,
        entity_name=experiment.name,
        user_id=current_user.id if current_user else None,
    ))

    db.commit()
    db.refresh(experiment)
    return ExperimentResponse.model_validate(experiment)


@router.put("/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(
    experiment_id: int,
    data: ExperimentUpdate,
    db: Session = Depends(get_db),
):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(experiment, key, value)

    db.add(Activity(
        action="experiment_updated",
        entity_type="experiment",
        entity_id=experiment.id,
        entity_name=experiment.name,
    ))
    db.commit()
    db.refresh(experiment)
    return ExperimentResponse.model_validate(experiment)


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    db.delete(experiment)
    db.commit()


@router.get("/{experiment_id}/variants", response_model=list[VariantResponse])
async def get_variants(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    variants = db.query(ExperimentVariant).filter(
        ExperimentVariant.experiment_id == experiment_id
    ).all()
    return [VariantResponse.model_validate(v) for v in variants]
